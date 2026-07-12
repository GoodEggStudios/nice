/**
 * Nice Embed Script
 * 
 * Usage:
 * <script src="https://api.nice.sbs/embed.js" data-button="n_xxx" async></script>
 * 
 * Options (data attributes):
 * - data-button: Button ID (required)
 * - data-theme: "light" | "dark" | "minimal" | "mono-dark" | "mono-light" (default: "light")
 * - data-size: "xs" | "sm" | "md" | "lg" | "xl" (default: "md")
 * - data-confetti: opt-in host-page confetti on nice (any value except "false" or "0")
 */
(function() {
  'use strict';

  const EMBED_BASE = 'https://api.nice.sbs';
  
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
    const confettiAttr = script.getAttribute('data-confetti');
    const enableConfetti = confettiAttr !== null && confettiAttr !== 'false' && confettiAttr !== '0';
    const dims = SIZES[size] || SIZES.md;

    // Create container
    const container = document.createElement('div');
    container.className = 'nice-embed';
    container.style.cssText = 'display:inline-block;vertical-align:middle;';

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${EMBED_BASE}/embed/${buttonId}?theme=${encodeURIComponent(theme)}&size=${encodeURIComponent(size)}`;
    iframe.style.cssText = `background:transparent;border:none;overflow:hidden;width:${dims.w}px;height:${dims.h}px;display:block;color-scheme:normal;`;
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    iframe.setAttribute('title', 'Nice button');

    container.appendChild(iframe);

    // Insert after script tag
    script.parentNode.insertBefore(container, script.nextSibling);

    let isMultiNice = false;
    let hasConfettied = false;

    function launchConfetti() {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1000';
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      const rect = container.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top;

      const colors = ['#fbbf24', '#f59e0b', '#fcd34d', '#fde68a', '#fff'];
      const GRAVITY = 0.12;
      const DRAG = 0.98;
      const particles = [];

      for (let i = 0; i < 35; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        const speed = 6 + Math.random() * 8;
        particles.push({
          x: originX + (Math.random() - 0.5) * rect.width * 0.6,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          w: 4 + Math.random() * 5,
          h: 3 + Math.random() * 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 12,
          opacity: 1,
        });
      }

      let frame = 0;
      function tick() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;

        for (const p of particles) {
          p.vy += GRAVITY;
          p.vx *= DRAG;
          p.vy *= DRAG;
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotSpeed;

          if (p.vy > 0 && frame > 20) {
            p.opacity -= 0.008;
          }

          if (p.opacity <= 0 || p.y > canvas.height) continue;
          alive = true;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation * Math.PI / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }

        frame++;
        if (alive && frame < 300) {
          requestAnimationFrame(tick);
        } else {
          canvas.remove();
        }
      }
      requestAnimationFrame(tick);
    }

    // Listen for resize and confetti messages from iframe
    window.addEventListener('message', function(event) {
      if (event.origin !== EMBED_BASE || event.source !== iframe.contentWindow) return;
      
      try {
        const data = event.data;
        if (data.type === 'nice-resize' && data.buttonId === buttonId) {
          iframe.style.width = data.width + 'px';
          iframe.style.height = data.height + 'px';
        }
        if (enableConfetti && data.buttonId === buttonId) {
          if (data.type === 'nice-clicked') {
            isMultiNice = true;
            launchConfetti();
          } else if (data.type === 'nice-recorded' && !isMultiNice && !hasConfettied) {
            hasConfettied = true;
            launchConfetti();
          }
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
