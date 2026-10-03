const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

function json(data, status = 200, cache = "no-store") {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": cache
  });
  for (const [k, v] of Object.entries(SECURITY)) headers.set(k, v);
  return new Response(JSON.stringify(data), { status, headers });
}

function secure(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/health") {
        return json({
          ok: true,
          service: "nexora-tech-store",
          runtime: "cloudflare-workers"
        }, 200, "no-store");
      }

      if (url.pathname === "/api/site") {
        const assetUrl = new URL("/site.json", request.url);
        const response = await env.ASSETS.fetch(new Request(assetUrl, request));
        if (!response.ok) return json({ error: "Site data unavailable" }, 404);
        const data = await response.json();
        return json(data, 200, "public, max-age=60");
      }

      if (url.pathname === "/api/order" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body || !Array.isArray(body.items) || body.items.length === 0) {
          return json({ error: "Order must contain at least one item." }, 400);
        }
        return json({
          ok: true,
          accepted: true,
          message: "Order validated. Complete the WhatsApp handoff from checkout."
        }, 202);
      }

      if (url.pathname === "/favicon.ico") {
        return new Response(null, { status: 204, headers: SECURITY });
      }

      return secure(await env.ASSETS.fetch(request));
    } catch (error) {
      return json({ error: "Unexpected server error" }, 500);
    }
  }
};
