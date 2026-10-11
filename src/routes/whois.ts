import { type RequestContext, targetAfter, usage } from "../context.ts";
import { getBaseDomain } from "../lib/domain.ts";
import { json } from "../lib/http.ts";

const RDAP_ENDPOINT = "https://rdap.org/domain/";

/** RDAP payload plus `_latency` (ms), or `{ error }` when the registry didn't answer. */
export type WhoisData = Record<string, unknown> & { _latency?: number };

export function fetchRdap(domain: string): Promise<Response> {
  return fetch(`${RDAP_ENDPOINT}${getBaseDomain(domain)}`, {
    headers: { accept: "application/rdap+json, application/json", "User-Agent": "curl/8.0.1" },
  });
}

/** WHOIS for the full lookup: never rejects, so one slow registry can't fail the lookup. */
export async function lookupWhois(domain: string): Promise<WhoisData> {
  const start = Date.now();
  try {
    const res = await fetchRdap(domain);
    const data: WhoisData = res.ok
      ? ((await res.json()) as WhoisData)
      : { error: `HTTP ${res.status}` };
    data._latency = Date.now() - start;
    return data;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
      _latency: Date.now() - start,
    };
  }
}

/** GET /whois/{domain}: raw RDAP data for the registrable domain. */
export async function whois(ctx: RequestContext): Promise<Response> {
  const domain = targetAfter(ctx, "/whois");
  if (!domain) return usage(ctx, "/whois/<DOMAIN>");

  const start = Date.now();
  const res = await fetchRdap(domain);
  const data: WhoisData = res.ok
    ? ((await res.json()) as WhoisData)
    : { error: `HTTP ${res.status}` };
  data._latency = Date.now() - start;
  return json(data, { space: ctx.jsonSpace });
}
