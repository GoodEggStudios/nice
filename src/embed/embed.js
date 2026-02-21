/**
 * Nice Embed Script
 * 
 * Usage:
 * <script src="https://nice.sbs/embed.js" data-button="n_xxx" async></script>
 * 
 * Options (data attributes):
 * - data-button: Button ID (required)
 * - data-theme: "light" | "dark" | "minimal" | "mono-dark" | "mono-light" (default: "light")
 * - data-size: "xs" | "md" | "xl" (default: "md")
 */
(function() {
  'use strict';

  const EMBED_BASE = 'https://nice.sbs';
  
  // Default iframe sizes per size variant
  const SIZES = {
    xs: { w: 70, h: 28 },
    sm: { w: 85, h: 32 },
    md: { w: 100, h: 36 },
    lg: { w: 120, h: 44 },
    xl: { w: 140, h: 52 }
  };

  // Find all nice embed scripts
  function init() {
    const scripts = document.querySelectorAll('script[data-button]');
    scripts.forEach(createEmbed);
  }

  function createEmbed(script) {
    const buttonId = script.getAttribute('data-button');
    if (!buttonId) return;

    const theme = script.getAttribute('data-theme') || 'light';
    const size = script.getAttribute('data-size') || 'md';
    const dims = SIZES[size] || SIZES.md;

    // Create container
    const container = document.createElement('div');
    container.className = 'nice-embed';
    container.style.cssText = 'display:inline-block;vertical-align:middle;';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${EMBED_BASE}/embed/${buttonId}?theme=${encodeURIComponent(theme)}&size=${encodeURIComponent(size)}`;
    iframe.style.cssText = `border:none;overflow:hidden;width:${dims.w}px;height:${dims.h}px;`;
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    iframe.setAttribute('title', 'Nice button');

    container.appendChild(iframe);

    // Insert after script tag
    script.parentNode.insertBefore(container, script.nextSibling);

    // Listen for resize messages from iframe
    window.addEventListener('message', function(event) {
      if (event.origin !== EMBED_BASE) return;
      
      try {
        const data = event.data;
        if (data.type === 'nice-resize' && data.buttonId === buttonId) {
          iframe.style.width = data.width + 'px';
          iframe.style.height = data.height + 'px';
        }
      } catch (e) {
        // Ignore invalid messages
      }
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
