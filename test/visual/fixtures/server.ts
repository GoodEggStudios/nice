import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { renderDemoEmbedHtml, renderEmbedHtml, renderEmbedScript, type EmbedSize, type EmbedTheme } from "../../../src/routes/embed";
import { generateBadge, normalizeTheme } from "../../../src/lib/badge";
import { VISUAL_BUTTON_ID } from "./data";

const rootDir = fileURLToPath(new URL("../../..", import.meta.url));
const websiteDir = join(rootDir, "website");

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
};

export interface VisualServer {
  origin: string;
  close(): Promise<void>;
}

function normalizeWebsitePath(pathname: string): string {
  if (pathname === "/") return "/index.html";
  if (pathname === "/create") return "/create.html";
  if (pathname === "/stats") return "/stats.html";
  if (pathname === "/button") return "/button.html";
  return pathname;
}

export async function startVisualServer(): Promise<VisualServer> {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");

      if (url.pathname === "/visual/host-script.html") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!doctype html><html><body><main class="host" style="padding:24px;background:#161616"><script src="https://api.nice.sbs/embed.js" data-button="${VISUAL_BUTTON_ID}" data-theme="dark" data-size="md" async></script></main></body></html>`);
        return;
      }

      if (url.pathname === "/embed.js") {
        res.writeHead(200, { "Content-Type": "application/javascript; charset=utf-8" });
        res.end(renderEmbedScript("https://api.nice.sbs"));
        return;
      }

      const embedMatch = url.pathname.match(/^\/(?:embed|e)\/([^/]+)$/);
      if (embedMatch) {
        const buttonId = embedMatch[1];
        const theme = (url.searchParams.get("theme") ?? "light") as EmbedTheme;
        const size = (url.searchParams.get("size") ?? "md") as EmbedSize;
        const html = buttonId === "demo"
          ? renderDemoEmbedHtml({ theme, size })
          : renderEmbedHtml({
              apiBase: "https://api.nice.sbs",
              buttonId,
              theme,
              size,
              multiNice: url.searchParams.get("multi") === "1",
            });
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      const badgeMatch = url.pathname.match(/^\/badge\/([^/]+)\.svg$/);
      if (badgeMatch) {
        const count = Number(url.searchParams.get("count") ?? "42");
        const theme = normalizeTheme(url.searchParams.get("theme") ?? undefined);
        res.writeHead(200, { "Content-Type": "image/svg+xml" });
        res.end(generateBadge(count, { theme }));
        return;
      }

      const safePath = normalize(normalizeWebsitePath(url.pathname)).replace(/^(\.\.[/\\])+/, "");
      const filePath = join(websiteDir, safePath);
      const body = await readFile(filePath);
      res.writeHead(200, { "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Visual server did not bind to a TCP port");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve())),
  };
}
