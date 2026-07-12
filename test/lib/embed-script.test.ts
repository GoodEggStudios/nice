import { describe, it, expect } from "vitest";
import { renderEmbedScript } from "../../src/routes/embed";

const EMBED_BASE = "https://api.nice.sbs";
const BUTTON_ID = "n_abc123456789";

interface MockIframe {
  tagName: "IFRAME";
  src: string;
  style: { cssText: string; width: string; height: string };
  contentWindow: object;
  setAttribute: () => void;
}

interface EmbedHarness {
  iframes: MockIframe[];
  canvases: unknown[];
  messageListeners: unknown[];
  dispatchMessage: (event: {
    origin: string;
    source: object;
    data: Record<string, unknown>;
  }) => void;
}

function loadEmbedHarness(scriptMarkup: string): EmbedHarness {
  const iframes: MockIframe[] = [];
  const canvases: unknown[] = [];
  const messageListeners: Array<(event: {
    origin: string;
    source: object;
    data: Record<string, unknown>;
  }) => void> = [];
  const domReadyListeners: Array<() => void> = [];

  const body = {
    children: [] as unknown[],
    appendChild(node: unknown) {
      this.children.push(node);
      return node;
    },
  };

  function createElement(tag: string) {
    if (tag === "iframe") {
      const iframe: MockIframe = {
        tagName: "IFRAME",
        src: "",
        style: { cssText: "", width: "100px", height: "36px" },
        contentWindow: {},
        setAttribute: () => undefined,
      };
      iframes.push(iframe);
      return iframe;
    }

    if (tag === "div") {
      return {
        className: "",
        style: { cssText: "" },
        appendChild: (child: unknown) => child,
        getBoundingClientRect: () => ({
          left: 10,
          top: 20,
          width: 100,
          height: 36,
        }),
      };
    }

    if (tag === "canvas") {
      const canvas = {
        style: { cssText: "" },
        width: 0,
        height: 0,
        getContext: () => ({
          clearRect: () => undefined,
          save: () => undefined,
          restore: () => undefined,
          translate: () => undefined,
          rotate: () => undefined,
          fillRect: () => undefined,
        }),
      };
      canvases.push(canvas);
      return canvas;
    }

    throw new Error(`Unexpected element: ${tag}`);
  }

  const document = {
    readyState: "complete",
    body,
    querySelectorAll(selector: string) {
      if (selector !== "script[data-button]") return [];
      const scripts = [];
      const pattern =
        /<script\b([^>]*)>/gi;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(scriptMarkup)) !== null) {
        const attrs = match[1];
        const script = {
          getAttribute(name: string) {
            const attr = attrs.match(new RegExp(`${name}=["']([^"']*)["']`));
            if (attr) return attr[1];
            if (attrs.includes(name)) return "";
            return null;
          },
          parentNode: {
            insertBefore: () => undefined,
          },
          nextSibling: null,
        };
        scripts.push(script);
      }
      return scripts;
    },
    createElement,
    addEventListener(type: string, listener: () => void) {
      if (type === "DOMContentLoaded") domReadyListeners.push(listener);
    },
  };

  const window = {
    innerWidth: 800,
    innerHeight: 600,
    addEventListener(type: string, listener: (event: {
      origin: string;
      source: object;
      data: Record<string, unknown>;
    }) => void) {
      if (type === "message") messageListeners.push(listener);
    },
    requestAnimationFrame: (_callback: () => void) => 0,
    document,
  };

  const context = {
    window,
    document,
    requestAnimationFrame: (callback: () => void) => window.requestAnimationFrame(callback),
    console,
    setTimeout,
    clearTimeout,
    Math,
    Date,
    encodeURIComponent,
    decodeURIComponent,
  };

  const runner = new Function(
    ...Object.keys(context),
    `${renderEmbedScript(EMBED_BASE)}`
  );
  runner(...Object.values(context));

  for (const listener of domReadyListeners) {
    listener();
  }

  return {
    iframes,
    canvases,
    messageListeners,
    dispatchMessage(event) {
      for (const listener of messageListeners) {
        listener(event);
      }
    },
  };
}

describe("renderEmbedScript runtime behavior", () => {
  function mount(scriptAttrs: string): EmbedHarness {
    return loadEmbedHarness(
      `<script src="${EMBED_BASE}/embed.js" data-button="${BUTTON_ID}" ${scriptAttrs}></script>`
    );
  }

  it("should resize only the iframe that sent a nice-resize message", () => {
    const markup = `
      <script src="${EMBED_BASE}/embed.js" data-button="${BUTTON_ID}"></script>
      <script src="${EMBED_BASE}/embed.js" data-button="${BUTTON_ID}"></script>
    `;
    const harness = loadEmbedHarness(markup);
    const [first, second] = harness.iframes;

    harness.dispatchMessage({
      origin: EMBED_BASE,
      source: first.contentWindow,
      data: { type: "nice-resize", buttonId: BUTTON_ID, width: 140, height: 52 },
    });

    expect(first.style.width).toBe("140px");
    expect(first.style.height).toBe("52px");
    expect(second.style.width).toBe("100px");
    expect(second.style.height).toBe("36px");
  });

  it("should ignore messages from an unrelated window", () => {
    const harness = mount("");
    const [iframe] = harness.iframes;
    const stranger = {};

    harness.dispatchMessage({
      origin: EMBED_BASE,
      source: stranger,
      data: { type: "nice-resize", buttonId: BUTTON_ID, width: 200, height: 80 },
    });

    expect(iframe.style.width).toBe("100px");
    expect(iframe.style.height).toBe("36px");
    expect(harness.canvases).toHaveLength(0);
  });

  it("should not launch confetti when data-confetti is disabled", () => {
    const harness = mount('data-confetti="false"');
    const [iframe] = harness.iframes;

    harness.dispatchMessage({
      origin: EMBED_BASE,
      source: iframe.contentWindow,
      data: { type: "nice-recorded", buttonId: BUTTON_ID, count: 1 },
    });

    expect(harness.canvases).toHaveLength(0);
  });

  it("should launch confetti once for single-nice confirmation", () => {
    const harness = mount("data-confetti");
    const [iframe] = harness.iframes;

    expect(harness.iframes).toHaveLength(1);
    expect(harness.messageListeners).toHaveLength(1);

    harness.dispatchMessage({
      origin: EMBED_BASE,
      source: iframe.contentWindow,
      data: { type: "nice-recorded", buttonId: BUTTON_ID, count: 1 },
    });
    harness.dispatchMessage({
      origin: EMBED_BASE,
      source: iframe.contentWindow,
      data: { type: "nice-recorded", buttonId: BUTTON_ID, count: 2 },
    });

    expect(harness.canvases).toHaveLength(1);
  });

  it("should launch confetti on every multi-nice click", () => {
    const harness = mount("data-confetti");
    const [iframe] = harness.iframes;

    harness.dispatchMessage({
      origin: EMBED_BASE,
      source: iframe.contentWindow,
      data: { type: "nice-clicked", buttonId: BUTTON_ID, count: 1 },
    });
    harness.dispatchMessage({
      origin: EMBED_BASE,
      source: iframe.contentWindow,
      data: { type: "nice-clicked", buttonId: BUTTON_ID, count: 2 },
    });

    expect(harness.canvases).toHaveLength(2);
  });

  it("should not double-handle one click across duplicate embeds", () => {
    const markup = `
      <script src="${EMBED_BASE}/embed.js" data-button="${BUTTON_ID}" data-confetti></script>
      <script src="${EMBED_BASE}/embed.js" data-button="${BUTTON_ID}" data-confetti></script>
    `;
    const harness = loadEmbedHarness(markup);
    const [first] = harness.iframes;

    harness.dispatchMessage({
      origin: EMBED_BASE,
      source: first.contentWindow,
      data: { type: "nice-clicked", buttonId: BUTTON_ID, count: 1 },
    });

    expect(harness.canvases).toHaveLength(1);
  });
});
