/**
 * Stats Page - Button management via private ID
 *
 * GET /stats/:private_id - Serve the stats/management page
 */

import type { Env, ButtonV2 } from "../types";
import { sha256, isValidPrivateId } from "../lib";

// Stats page HTML template
const STATS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <title>Button Stats - Nice</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bungee&family=Inter:wght@400;500;600&family=Fira+Code&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0f0f0f;
      color: #f5f5f5;
      min-height: 100vh;
      padding: 2rem;
      line-height: 1.6;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    
    header {
      margin-bottom: 2rem;
    }
    
    .logo {
      font-family: 'Bungee', cursive;
      font-size: 2rem;
      color: #fbbf24;
      text-decoration: none;
    }
    
    h1 {
      font-family: 'Bungee', cursive;
      font-size: 2rem;
      margin-bottom: 0.5rem;
      color: #fff;
    }
    
    .stat-card {
      background: #1a1a1a;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid #333;
    }
    
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid #2a2a2a;
    }
    
    .stat-row:last-child {
      border-bottom: none;
    }
    
    .stat-label {
      color: #888;
      font-size: 0.875rem;
    }
    
    .stat-value {
      font-family: 'Fira Code', monospace;
      color: #fff;
      font-size: 0.875rem;
      text-align: right;
      word-break: break-all;
      max-width: 60%;
    }
    
    .stat-value.large {
      font-family: 'Bungee', cursive;
      font-size: 2rem;
      color: #fbbf24;
    }
    
    .stat-value a {
      color: #fbbf24;
      text-decoration: none;
    }
    
    .stat-value a:hover {
      text-decoration: underline;
    }
    
    .section-title {
      font-family: 'Bungee', cursive;
      font-size: 0.875rem;
      color: #666;
      margin-bottom: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .snippet-container {
      position: relative;
    }
    
    .snippet {
      font-family: 'Fira Code', monospace;
      font-size: 0.75rem;
      background: #0a0a0a;
      padding: 1rem;
      border-radius: 6px;
      overflow-x: auto;
      border: 1px solid #333;
      white-space: pre-wrap;
      word-break: break-all;
    }
    
    .btn-copy {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      padding: 0.5rem 0.75rem;
      font-size: 0.75rem;
      background: #333;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .btn-copy:hover {
      background: #444;
    }
    
    .btn-copy.copied {
      background: #22c55e;
    }
    
    .preview-container {
      display: flex;
      justify-content: center;
      padding: 1.5rem;
      background: #0a0a0a;
      border-radius: 8px;
      margin-top: 1rem;
    }
    
    .btn-delete {
      width: 100%;
      padding: 0.75rem;
      font-family: 'Bungee', cursive;
      font-size: 0.875rem;
      background: transparent;
      color: #ef4444;
      border: 2px solid #ef4444;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      text-transform: uppercase;
    }
    
    .btn-delete:hover {
      background: #ef4444;
      color: #fff;
    }
    
    .claim-section {
      background: #1a1a1a;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border: 1px solid #333;
      opacity: 0.6;
    }
    
    .claim-title {
      font-family: 'Bungee', cursive;
      font-size: 1rem;
      color: #888;
      margin-bottom: 0.5rem;
    }
    
    .claim-text {
      color: #666;
      font-size: 0.875rem;
    }
    
    .error-page {
      text-align: center;
      padding: 4rem 2rem;
    }
    
    .error-page h1 {
      color: #ef4444;
      margin-bottom: 1rem;
    }
    
    .error-page p {
      color: #888;
      margin-bottom: 2rem;
    }
    
    .btn-home {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      font-family: 'Bungee', cursive;
      font-size: 0.875rem;
      background: #fbbf24;
      color: #000;
      text-decoration: none;
      border-radius: 8px;
      transition: all 0.15s ease;
    }
    
    .btn-home:hover {
      background: #f59e0b;
    }
    
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      justify-content: center;
      align-items: center;
      z-index: 100;
    }
    
    .modal.show {
      display: flex;
    }
    
    .modal-content {
      background: #1a1a1a;
      padding: 2rem;
      border-radius: 12px;
      max-width: 400px;
      text-align: center;
    }
    
    .modal-title {
      font-family: 'Bungee', cursive;
      color: #ef4444;
      margin-bottom: 1rem;
    }
    
    .modal-text {
      color: #aaa;
      margin-bottom: 1.5rem;
    }
    
    .modal-buttons {
      display: flex;
      gap: 1rem;
    }
    
    .modal-btn {
      flex: 1;
      padding: 0.75rem;
      font-family: 'Bungee', cursive;
      font-size: 0.875rem;
      border-radius: 6px;
      cursor: pointer;
      border: none;
    }
    
    .modal-btn.cancel {
      background: #333;
      color: #fff;
    }
    
    .modal-btn.confirm {
      background: #ef4444;
      color: #fff;
    }
    
    @media (max-width: 480px) {
      body { padding: 1rem; }
      h1 { font-size: 1.5rem; }
      .stat-row { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
      .stat-value { max-width: 100%; text-align: left; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <a href="/" class="logo">NICE</a>
    </header>
    
    {{CONTENT}}
  </div>
  
  {{SCRIPTS}}
</body>
</html>`;

// Content for found button
const STATS_CONTENT = `
    <h1>BUTTON STATS</h1>
    
    <div class="stat-card">
      <div class="stat-row">
        <span class="stat-label">Nice Count</span>
        <span class="stat-value large">{{COUNT}}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Content URL</span>
        <span class="stat-value"><a href="{{URL}}" target="_blank" rel="noopener">{{URL_DISPLAY}}</a></span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Restriction</span>
        <span class="stat-value">{{RESTRICTION}}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Public ID</span>
        <span class="stat-value">{{PUBLIC_ID}}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Created</span>
        <span class="stat-value">{{CREATED}}</span>
      </div>
    </div>
    
    <div class="section-title">Embed Snippet</div>
    <div class="stat-card">
      <div class="snippet-container">
        <pre class="snippet">{{SNIPPET}}</pre>
        <button type="button" class="btn-copy" id="copyBtn">Copy</button>
      </div>
      
      <div class="preview-container">
        {{PREVIEW}}
      </div>
    </div>
    
    <div class="claim-section">
      <div class="claim-title">Claim This Button</div>
      <div class="claim-text">Coming soon — link this button to your account for easier management.</div>
    </div>
    
    <div class="stat-card">
      <button type="button" class="btn-delete" id="deleteBtn">Delete Button</button>
    </div>
    
    <div class="modal" id="deleteModal">
      <div class="modal-content">
        <div class="modal-title">Delete Button?</div>
        <div class="modal-text">This cannot be undone. All nice counts will be lost.</div>
        <div class="modal-buttons">
          <button class="modal-btn cancel" id="cancelDelete">Cancel</button>
          <button class="modal-btn confirm" id="confirmDelete">Delete</button>
        </div>
      </div>
    </div>`;

const STATS_SCRIPTS = `
  <script>
    const PRIVATE_ID = '{{PRIVATE_ID}}';
    
    // Copy button
    document.getElementById('copyBtn').addEventListener('click', () => {
      const snippet = document.querySelector('.snippet').textContent;
      navigator.clipboard.writeText(snippet).then(() => {
        const btn = document.getElementById('copyBtn');
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
    
    // Delete flow
    const modal = document.getElementById('deleteModal');
    document.getElementById('deleteBtn').addEventListener('click', () => {
      modal.classList.add('show');
    });
    document.getElementById('cancelDelete').addEventListener('click', () => {
      modal.classList.remove('show');
    });
    document.getElementById('confirmDelete').addEventListener('click', async () => {
      try {
        const res = await fetch('/api/v2/buttons/' + PRIVATE_ID, { method: 'DELETE' });
        if (res.ok) {
          window.location.href = '/?deleted=1';
        } else {
          alert('Failed to delete button');
        }
      } catch (e) {
        alert('Failed to delete button');
      }
    });
  </script>`;

// Content for not found
const NOT_FOUND_CONTENT = `
    <div class="error-page">
      <h1>BUTTON NOT FOUND</h1>
      <p>This button doesn't exist or the private ID is invalid.</p>
      <a href="/create" class="btn-home">Create a Button</a>
    </div>`;

// Size dimensions
const SIZES: Record<string, { w: number; h: number }> = {
  xs: { w: 70, h: 28 },
  sm: { w: 85, h: 32 },
  md: { w: 100, h: 36 },
  lg: { w: 120, h: 44 },
  xl: { w: 140, h: 52 },
};

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLen = 50): string {
  if (url.length <= maxLen) return url;
  return url.substring(0, maxLen - 3) + "...";
}

/**
 * Format date for display
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format restriction mode for display
 */
function formatRestriction(mode: string): string {
  switch (mode) {
    case "url":
      return "This URL only";
    case "domain":
      return "This domain";
    case "global":
      return "Global (any site)";
    default:
      return mode;
  }
}

/**
 * GET /stats/:private_id - Serve the stats page
 */
export async function serveStatsPage(
  request: Request,
  privateId: string,
  env: Env
): Promise<Response> {
  // Validate private ID format
  if (!isValidPrivateId(privateId)) {
    const html = STATS_HTML
      .replace("{{CONTENT}}", NOT_FOUND_CONTENT)
      .replace("{{SCRIPTS}}", "");

    return new Response(html, {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "no-referrer",
      },
    });
  }

  // Look up button by private ID
  const secretHash = await sha256(privateId);
  const publicId = await env.NICE_KV.get(`secret:${secretHash}`);

  if (!publicId) {
    const html = STATS_HTML
      .replace("{{CONTENT}}", NOT_FOUND_CONTENT)
      .replace("{{SCRIPTS}}", "");

    return new Response(html, {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "no-referrer",
      },
    });
  }

  // Get button data
  const buttonData = await env.NICE_KV.get(`btn:${publicId}`);
  if (!buttonData) {
    const html = STATS_HTML
      .replace("{{CONTENT}}", NOT_FOUND_CONTENT)
      .replace("{{SCRIPTS}}", "");

    return new Response(html, {
      status: 404,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Referrer-Policy": "no-referrer",
      },
    });
  }

  const button: ButtonV2 = JSON.parse(buttonData);
  const theme = button.theme || "light";
  const size = button.size || "md";
  const dims = SIZES[size] || SIZES.md;

  // Build embed snippet
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const embedUrl = `${baseUrl}/e/${publicId}?theme=${theme}&size=${size}`;
  const snippet = `<iframe src="${embedUrl}" style="border:none;width:${dims.w}px;height:${dims.h}px;" title="Nice button"></iframe>`;

  // Build preview iframe
  const preview = `<iframe src="${embedUrl}" style="border:none;width:${dims.w}px;height:${dims.h}px;" title="Nice button"></iframe>`;

  // Build content
  const content = STATS_CONTENT
    .replace("{{COUNT}}", button.count.toString())
    .replace("{{URL}}", escapeHtml(button.url))
    .replace("{{URL_DISPLAY}}", escapeHtml(truncateUrl(button.url)))
    .replace("{{RESTRICTION}}", formatRestriction(button.restriction))
    .replace("{{PUBLIC_ID}}", escapeHtml(publicId))
    .replace("{{CREATED}}", formatDate(button.createdAt))
    .replace("{{SNIPPET}}", escapeHtml(snippet))
    .replace("{{PREVIEW}}", preview);

  const scripts = STATS_SCRIPTS.replace("{{PRIVATE_ID}}", escapeHtml(privateId));

  const html = STATS_HTML
    .replace("{{CONTENT}}", content)
    .replace("{{SCRIPTS}}", scripts);

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    },
  });
}
