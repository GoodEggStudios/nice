/**
 * E2E tests for embed routes
 *
 * Tests embed.js and embed page serving through the worker.
 */

import { describe, it, expect } from "vitest";
import { SELF, env } from "cloudflare:test";
import {
  EMBED_DIMENSIONS,
  EMBED_SIZES,
  renderDemoEmbedHtml,
  renderEmbedHtml,
  renderEmbedScript,
} from "../../src/routes/embed";

describe("Embed", () => {
  describe("GET /embed.js", () => {
    it("should serve JavaScript with correct content type", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");

      expect(res.status).toBe(200);
      const ct = res.headers.get("Content-Type") || "";
      expect(ct).toContain("javascript");
    });

    it("should include CORS headers for cross-site embedding", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");

      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("should contain embed initialization code", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");
      const body = await res.text();

      expect(body).toContain("nice-embed");
      expect(body).toContain("data-button");
    });

    it("should point iframe embeds back to the API host", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");
      const body = await res.text();

      expect(body).toContain("const EMBED_BASE='https://api.nice.sbs'");
      expect(body).not.toContain("const EMBED_BASE='https://nice.sbs'");
    });

    it("should style generated iframes as transparent", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");
      const body = await res.text();

      expect(body).toContain("background:transparent;border:none;overflow:hidden");
      expect(body).toContain("display:block");
      expect(body).toContain("color-scheme:normal");
    });
  });

  describe("GET /embed/:button_id", () => {
    it("should serve HTML with the button ID embedded", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789");

      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain("n_abc123456789");
      expect(body).toContain("<!DOCTYPE html");
    });

    it("should apply theme parameter", async () => {
      const resLight = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789?theme=light");
      const resDark = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789?theme=dark");

      const lightBody = await resLight.text();
      const darkBody = await resDark.text();

      // Different themes should produce different HTML
      expect(lightBody).not.toBe(darkBody);
    });

    it("should apply size parameter", async () => {
      const resMd = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789?size=md");
      const resXl = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789?size=xl");

      const mdBody = await resMd.text();
      const xlBody = await resXl.text();

      expect(mdBody).not.toBe(xlBody);
    });

    it("should include frame-friendly headers", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789");

      // Embeds must be frameable from any site
      const xfo = res.headers.get("X-Frame-Options");
      const csp = res.headers.get("Content-Security-Policy");

      // Should either not have X-Frame-Options or have ALLOWALL
      if (xfo) {
        expect(xfo.toUpperCase()).toContain("ALLOW");
      }
      // CSP frame-ancestors should allow all
      if (csp) {
        expect(csp).toContain("frame-ancestors");
      }
    });

    it("should render the root document with a transparent background", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789");
      const body = await res.text();

      expect(body).toContain("html,body{background:transparent}");
    });

    it("should size the iframe to the padded transparent document", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789");
      const body = await res.text();

      expect(body).toContain("justify-content:center;padding:2px");
      expect(body).toContain("const root=document.documentElement;");
      expect(body).toContain("width:Math.ceil(root.scrollWidth),height:Math.ceil(root.scrollHeight)");
      expect(body).not.toContain("width:Math.ceil(rect.width)+8,height:Math.ceil(rect.height)+8");
    });

    it("should return 400 for invalid button ID", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed/not_valid");

      expect(res.status).toBe(400);
    });

    it("should fall back to defaults for invalid theme/size", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/embed/n_abc123456789?theme=neon&size=xxxl"
      );

      // Should still serve successfully with defaults
      expect(res.status).toBe(200);
    });

    it("should render persisted labels and ignore URL label overrides", async () => {
      const buttonId = "n_labels123456";
      await env.NICE_KV.put(
        `btn:${buttonId}`,
        JSON.stringify({ label: "Recommend", pressedLabel: "Recommended", multiNice: false })
      );

      const res = await SELF.fetch(
        `https://api.nice.sbs/embed/${buttonId}?label=Attacker&pressed_label=Injected`
      );
      const body = await res.text();

      expect(body).toContain('<span class="nice-text" id="niceText">Recommend</span>');
      expect(body).toContain('const LABEL="Recommend";');
      expect(body).toContain('const PRESSED_LABEL="Recommended";');
      expect(body).not.toContain("Attacker");
      expect(body).not.toContain("Injected");

      const forcedSingle = await SELF.fetch(
        "https://api.nice.sbs/embed/" + buttonId + "?multi=0"
      );
      const forcedSingleBody = await forcedSingle.text();
      expect(forcedSingleBody).toContain("const IS_MULTI='0'==='1';");
    });

    it("should use the stored label contract for clap mode", async () => {
      const buttonId = "n_claplabels12";
      await env.NICE_KV.put(
        `btn:${buttonId}`,
        JSON.stringify({ label: "Recommend", pressedLabel: "Recommended", multiNice: true })
      );

      const res = await SELF.fetch(`https://api.nice.sbs/embed/${buttonId}`);
      const body = await res.text();

      expect(body).toContain("const IS_MULTI='1'==='1';");
      expect(body).toContain("textEl.textContent=IS_MULTI?LABEL:PRESSED_LABEL;");
    });

    it("should keep malformed stored labels inert and defaulted", async () => {
      const buttonId = "n_malformed12";
      const payload = "<img src=x onerror=alert(1)>";
      await env.NICE_KV.put(
        `btn:${buttonId}`,
        JSON.stringify({ label: payload, pressedLabel: 42, multiNice: false })
      );

      const res = await SELF.fetch(`https://api.nice.sbs/embed/${buttonId}`);
      const body = await res.text();

      expect(body).toContain('<span class="nice-text" id="niceText">&lt;img src=x onerror=alert(1)&gt;</span>');
      expect(body).toContain('const PRESSED_LABEL="Nice\'d";');
      expect(body).toContain('const LABEL="\\u003cimg src=x onerror=alert(1)\\u003e";');
      expect(body).not.toContain("<img src=x onerror=alert(1)>");
    });
  });

  describe("renderer label serialization", () => {
    it("should escape labels in HTML and inline JavaScript", () => {
      const label = '</script><span title="x">& 😀';
      const pressedLabel = `Pressed \\ " ${label}`;
      const html = renderEmbedHtml({
        apiBase: "https://api.nice.sbs",
        buttonId: "n_abc123456789",
        theme: "light",
        size: "md",
        label,
        pressedLabel,
      });

      expect(html).toContain("&lt;/script&gt;&lt;span title=&quot;x&quot;&gt;&amp; 😀");
      expect(html).toContain(
        'const LABEL="\\u003c/script\\u003e\\u003cspan title=\\"x\\"\\u003e\\u0026 😀";'
      );
      expect(html).toContain('const PRESSED_LABEL="Pressed \\\\ \\\" \\u003c/script');
      expect(html).not.toContain("</script><span title=\"x\">");

      const replacementPayload = renderEmbedHtml({
        apiBase: "https://api.nice.sbs",
        buttonId: "n_abc123456789",
        theme: "light",
        size: "md",
        label: "$&",
        pressedLabel: String.fromCharCode(36, 96, 36, 39),
      });
      expect(replacementPayload).toContain('<span class="nice-text" id="niceText">$&amp;</span>');
      expect(replacementPayload).toContain('const LABEL="$\\u0026";');
    });

    it("should default demo labels while allowing explicit renderer values", () => {
      const defaults = renderDemoEmbedHtml({ theme: "light", size: "md" });
      const custom = renderDemoEmbedHtml({
        theme: "light",
        size: "md",
        label: "Recommend",
        pressedLabel: "Recommended",
      });

      expect(defaults).toContain("Nice</span>");
      expect(custom).toContain("Recommend</span>");
      expect(custom).toContain('const LABEL="Recommend";');
    });
  });

  describe("shared embed helpers", () => {
    it("should serve the shared embed script byte-for-byte", async () => {
      const res = await SELF.fetch("https://api.nice.sbs/embed.js");

      expect(res.status).toBe(200);
      expect(await res.text()).toBe(renderEmbedScript());
      expect(renderEmbedScript()).toContain("const EMBED_BASE='https://api.nice.sbs'");
    });

    it("should escape custom embed bases in the generated script literal", async () => {
      const customBase = "https://exa'mple.test/a\\b\nc";
      const script = renderEmbedScript(customBase);

      expect(script).toContain("const EMBED_BASE='https://exa\\'mple.test/a\\\\b\\nc'");
      expect(script).not.toContain(customBase);
    });

    it("should generate script sizes from shared embed dimensions", async () => {
      const expectedSizes = `{${EMBED_SIZES.map((size) => {
        const dim = EMBED_DIMENSIONS[size];
        return `${size}:{w:${dim.w},h:${dim.h}}`;
      }).join(",")}}`;

      expect(renderEmbedScript()).toContain(`const SIZES=${expectedSizes};`);
    });

    it("should keep supported themes and sizes rendering through shared helpers", async () => {
      const res = await SELF.fetch(
        "https://api.nice.sbs/embed/n_abc123456789?theme=mono-light&size=sm"
      );

      expect(res.status).toBe(200);
      const body = await res.text();
      expect(body).toContain('class="theme-mono-light size-sm"');
    });

    describe("host-page confetti (data-confetti)", () => {
      it("should include confetti-related code in the served embed script", async () => {
        const res = await SELF.fetch("https://api.nice.sbs/embed.js");
        const body = await res.text();

        expect(body).toContain("data-confetti");
        expect(body).toContain("confettiAttr");
        expect(body).toContain("enableConfetti");
        expect(body).toContain("launchConfetti");
        expect(body).toContain("nice-clicked");
        expect(body).toContain("nice-recorded");
      });

      it("should opt in only when data-confetti is present and not disabled", () => {
        const script = renderEmbedScript();

        expect(script).toContain("confettiAttr=script.getAttribute('data-confetti')");
        expect(script).toContain(
          "enableConfetti=confettiAttr!==null&&confettiAttr!=='false'&&confettiAttr!=='0'"
        );
      });

      it("should scope message handlers to the embed iframe source", () => {
        const script = renderEmbedScript();

        expect(script).toContain(
          "if(event.origin!==EMBED_BASE||event.source!==iframe.contentWindow)return"
        );
      });

      it("should gate confetti message handlers on enableConfetti", () => {
        const script = renderEmbedScript();

        expect(script).toContain("if(enableConfetti&&data.buttonId===buttonId)");
        expect(script).toContain("data.type==='nice-clicked'");
        expect(script).toContain("data.type==='nice-recorded'&&!isMultiNice&&!hasConfettied");
        expect(script).toContain("isMultiNice=true;launchConfetti()");
        expect(script).toContain("hasConfettied=true;launchConfetti()");
      });
    });
  });

  describe("GET /e/:button_id (short URL)", () => {
    it("should serve same content as /embed/:id", async () => {
      const resLong = await SELF.fetch("https://api.nice.sbs/embed/n_abc123456789?theme=dark");
      const resShort = await SELF.fetch("https://api.nice.sbs/e/n_abc123456789?theme=dark");

      expect(resShort.status).toBe(200);
      const longBody = await resLong.text();
      const shortBody = await resShort.text();
      expect(longBody).toBe(shortBody);
    });
  });
});
