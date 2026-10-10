import { type RequestContext, targetAfter, usage } from "../context.ts";
import { json } from "../lib/http.ts";

/** GET /history/{domain}: historical A records from SecurityTrails, with the caller's API key. */
export async function history(ctx: RequestContext): Promise<Response> {
  const domain = targetAfter(ctx, "/history");
  if (!domain) return usage(ctx, "/history/<DOMAIN>?apikey=<KEY>");

  const apiKey = ctx.url.searchParams.get("apikey") || ctx.request.headers.get("x-api-key");
  if (!apiKey) {
    return json(
      {
        error:
          "API key is required for historical DNS. Please provide ?apikey= or X-API-Key header. (e.g. SecurityTrails API Key)",
      },
      { status: 401 },
    );
  }

  try {
    const res = await fetch(`https://api.securitytrails.com/v1/history/${domain}/dns/a`, {
      headers: { accept: "application/json", APIKEY: apiKey },
    });
    return json(await res.json(), { space: ctx.jsonSpace, status: res.status });
  } catch {
    return json({ error: "Failed to fetch DNS history from SecurityTrails." }, { status: 500 });
  }
}
