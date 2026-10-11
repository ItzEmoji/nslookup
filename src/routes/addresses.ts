import { type RequestContext, targetAfter, usage } from "../context.ts";
import { collectAnswerData } from "../lib/dns.ts";
import { json, reply, text } from "../lib/http.ts";

interface AddressResult {
  domain: string;
  ipv4?: string[];
  ipv6?: string[];
}

/** GET /ip/{domain}: IPv4 and IPv6 addresses as JSON. `?ipv4=false` / `?ipv6=false` drop one. */
export async function addresses(ctx: RequestContext): Promise<Response> {
  const domain = targetAfter(ctx, "/ip");
  if (!domain) return usage(ctx, "/ip/<DOMAIN>");

  const result: AddressResult = { domain };
  if (ctx.url.searchParams.get("ipv4") !== "false") {
    result.ipv4 = await collectAnswerData(domain, "A", ctx.resolvers);
  }
  if (ctx.url.searchParams.get("ipv6") !== "false") {
    result.ipv6 = await collectAnswerData(domain, "AAAA", ctx.resolvers);
  }
  return json(result, { space: ctx.jsonSpace });
}

/** GET /ipv4/{domain} and /ipv6/{domain}: the first address as plain text, for scripts. */
export function firstAddress(version: 4 | 6) {
  const prefix = `/ipv${version}`;
  const recordType = version === 4 ? "A" : "AAAA";

  return async (ctx: RequestContext): Promise<Response> => {
    const domain = targetAfter(ctx, prefix);
    if (!domain) return usage(ctx, `${prefix}/<DOMAIN>`);

    const [address] = await collectAnswerData(domain, recordType, ctx.resolvers);
    if (!address) return reply("Not found\n", { status: 404 });
    return text(`${address}\n`);
  };
}
