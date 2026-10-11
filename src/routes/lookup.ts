import type { RequestContext } from "../context.ts";
import { isListedOnSpamhaus } from "../lib/abuse.ts";
import { buildConsensus, type Consensus, isPropagated, type TypeResult } from "../lib/dns.ts";
import { isIPv4, isIPv6, isValidDomain } from "../lib/domain.ts";
import { json, text } from "../lib/http.ts";
import { answersByResolver, planQuery, queryAllResolvers } from "../lib/lookup.ts";
import { lookupWhois, type WhoisData } from "./whois.ts";

const DEFAULT_TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CAA", "CNAME", "SOA"];

interface TypeLookup extends TypeResult {
  consensus: Consensus | null;
}

/** `?type=TXT,MX` (or `?records=`) narrows the lookup; `ALL` keeps the defaults. */
function requestedTypes(url: URL): string[] {
  const param = url.searchParams.get("records") || url.searchParams.get("type");
  if (!param || param.toUpperCase() === "ALL") return DEFAULT_TYPES;
  return param.toUpperCase().split(",");
}

/** GET /: the caller's own IP address. */
export function clientIp(ctx: RequestContext): Response {
  return text(`${ctx.request.headers.get("CF-Connecting-IP") || "Unknown IP"}\n`);
}

/**
 * GET /{domain-or-ip}: every record type from every resolver with a consensus
 * per type, plus propagation, Spamhaus and WHOIS status, in one payload.
 */
export async function lookup(ctx: RequestContext, target: string): Promise<Response> {
  const { url } = ctx;
  if (!isIPv4(target) && !isIPv6(target) && !isValidDomain(target)) {
    return json(
      { error: "Invalid domain or IP address format" },
      { status: 400, space: ctx.jsonSpace },
    );
  }

  const plan = planQuery(target, requestedTypes(url));
  const wantsWhois = url.searchParams.get("whois") !== "false" && !plan.isReverse;
  const abuseResolver = url.searchParams.get("resolver") || Object.values(ctx.resolvers)[0];

  const [raw, whois, abuse] = await Promise.all([
    queryAllResolvers(plan, ctx.resolvers),
    wantsWhois ? lookupWhois(target) : Promise.resolve<WhoisData>({ error: "Skipped" }),
    isListedOnSpamhaus(target, abuseResolver),
  ]);

  const dns: Record<string, TypeLookup> = {};
  for (const [type, results] of Object.entries(raw)) {
    dns[type] = { consensus: buildConsensus(results, type), resolvers: answersByResolver(results) };
  }

  return json(
    {
      target,
      isReverseSearch: plan.isReverse,
      records_queried: plan.types,
      propagated: isPropagated(dns, plan.types),
      abuse,
      dns,
      whois,
    },
    { space: ctx.jsonSpace },
  );
}
