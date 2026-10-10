import type { RequestContext } from "../context.ts";
import { reply } from "../lib/http.ts";

/**
 * GET /proxy-dns?url=&name=&type=: forwards a DoH JSON query to `url`, so the
 * web app can reach resolvers that don't send CORS headers.
 */
export async function proxyDns(ctx: RequestContext): Promise<Response> {
  const params = ctx.url.searchParams;
  const targetUrl = params.get("url");
  const name = params.get("name");
  const type = params.get("type");
  if (!targetUrl || !name || !type) return reply("Missing params", { status: 400 });

  try {
    const res = await fetch(`${targetUrl}?name=${name}&type=${type}`, {
      headers: { accept: "application/dns-json" },
    });
    return reply(await res.text(), { status: res.status, contentType: "application/json" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return reply(JSON.stringify({ error: message }), { status: 500 });
  }
}
