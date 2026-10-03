const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

function json(data, status = 200) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  for (const [k, v] of Object.entries(SECURITY)) headers.set(k, v);
  return new Response(JSON.stringify(data), { status, headers });
}

function secure(res) {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/api/health") {
        return json({ ok: true, service: "nexora-gadgets", runtime: "cloudflare-workers" });
      }

      if (url.pathname === "/api/site") {
        const r = await env.ASSETS.fetch(new Request(new URL("/site.json", request.url), request));
        if (!r.ok) return json({ error: "Site data unavailable" }, 404);
        const data = await r.json();
        return json(data, 200);
      }

      if (url.pathname === "/api/order" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body || !Array.isArray(body.items) || body.items.length < 1) {
          return json({ error: "Order must contain at least one item." }, 400);
        }
        return json({
          ok: true,
          accepted: true,
          message: "Order validated. Complete the WhatsApp handoff from checkout."
        }, 202);
      }

      if (url.pathname === "/favicon.ico") return new Response(null, { status: 204, headers: SECURITY });

      return secure(await env.ASSETS.fetch(request));
    } catch {
      return json({ error: "Unexpected server error" }, 500);
    }
  }
};
