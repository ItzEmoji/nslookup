import { type RequestContext, targetAfter, usage } from "../context.ts";
import { json } from "../lib/http.ts";

type Provider = "certspotter" | "crt.sh";

function fetchIssuances(provider: Provider, domain: string): Promise<Response> {
  if (provider === "crt.sh") {
    return fetch(`https://crt.sh/?q=%25.${domain}&output=json`, {
      headers: { accept: "application/json", "User-Agent": "curl/8.0.1" },
    });
  }
  return fetch(
    `https://api.certspotter.com/v1/issuances?domain=${domain}&include_subdomains=true&expand=dns_names`,
    { headers: { accept: "application/json", "User-Agent": "nslookup-worker/1.0" } },
  );
}

/**
 * crt.sh sometimes streams several JSON arrays or bare objects back to back
 * instead of one array; stitch them into a single array before parsing.
 */
export function parseCertificateList(body: string, provider: Provider): unknown {
  const stitched =
    provider === "crt.sh" ? body.replace(/\]\s*\[/g, ",").replace(/}\s*{/g, "},{") : body;
  try {
    return JSON.parse(stitched);
  } catch {
    return JSON.parse(`[${stitched.replace(/}\s*{/g, "},{")}]`);
  }
}

/** GET /ssl/{domain}: certificate issuance history (`?provider=certspotter|crt.sh`). */
export async function ssl(ctx: RequestContext): Promise<Response> {
  const domain = targetAfter(ctx, "/ssl");
  if (!domain) return usage(ctx, "/ssl/<DOMAIN>?provider=certspotter|crt.sh");

  const provider: Provider =
    ctx.url.searchParams.get("provider") === "crt.sh" ? "crt.sh" : "certspotter";
  // Echo the requested name in errors, even when it fell back to certspotter.
  const providerName = ctx.url.searchParams.get("provider") || "certspotter";

  let body: string | undefined;
  try {
    const res = await fetchIssuances(provider, domain);
    if (res.ok) body = await res.text();
  } catch {
    return json({ error: `Failed to fetch from ${providerName}` }, { status: 500 });
  }
  // An upstream error status is reported as "no certificates", not as a failure.
  if (body === undefined) return json([], { space: ctx.jsonSpace });

  try {
    return json(parseCertificateList(body, provider), { space: ctx.jsonSpace });
  } catch {
    return json({ error: `Invalid JSON from ${providerName}` }, { status: 500 });
  }
}
