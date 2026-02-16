import type { Env } from "./types";

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // TODO: Add routes for API endpoints
    return new Response("Nice - Simple Button Service", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  },
};
