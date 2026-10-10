import { primaryResolver, type RequestContext, targetAfter, usage } from "../context.ts";
import { queryResolver } from "../lib/dns.ts";
import { json } from "../lib/http.ts";

/** GET /security/{domain}: SPF, DMARC, DKIM and CAA posture from the primary resolver. */
export async function security(ctx: RequestContext): Promise<Response> {
  const domain = targetAfter(ctx, "/security");
  if (!domain) return usage(ctx, "/security/<DOMAIN>");

  const resolverUrl = primaryResolver(ctx) ?? "";
  const [txt, dmarcTxt, caa] = await Promise.all([
    queryResolver(domain, "TXT", "Primary", resolverUrl),
    queryResolver(`_dmarc.${domain}`, "TXT", "Primary", resolverUrl),
    queryResolver(domain, "CAA", "Primary", resolverUrl),
  ]);

  let spf: string | null = null;
  let dkim = false;
  for (const { data } of txt.answers) {
    if (data?.includes("v=spf1")) spf = data;
    if (data?.includes("v=DKIM1")) dkim = true;
  }

  let dmarc: string | null = null;
  for (const { data } of dmarcTxt.answers) {
    if (data?.includes("v=DMARC1")) dmarc = data;
  }

  return json(
    { domain, spf, dmarc, dkim, hasCAA: caa.answers.length > 0 },
    { space: ctx.jsonSpace },
  );
}
