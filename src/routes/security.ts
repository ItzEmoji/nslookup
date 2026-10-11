import { primaryResolver, type RequestContext, targetAfter, usage } from "../context.ts";
import { normalizeAnswer, queryResolver, type ResolverResult } from "../lib/dns.ts";
import { json } from "../lib/http.ts";

export interface Dmarc {
  /** The record, unquoted. */
  record: string;
  /** `p=`: none, quarantine or reject. */
  policy: string | null;
  /** `sp=`, the policy for subdomains; null when it inherits `p=`. */
  subdomainPolicy: string | null;
}

export interface SecurityPosture {
  domain: string;
  /** Every SPF record at the domain. More than one is an error (permerror) for receivers. */
  spf: string[];
  /** The DMARC record at `_dmarc.<domain>`, or null when there is none. */
  dmarc: Dmarc | null;
  /** Keys by selector for the selectors asked for with `?dkim=`; null when none were asked for. */
  dkim: Record<string, string | null> | null;
  /** CAA records; empty means any certificate authority may issue. */
  caa: string[];
}

const SELECTOR = /^[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/i;
const MAX_SELECTORS = 10;

/** TXT answers unquoted and joined, without duplicates. */
function txtRecords(result: ResolverResult): string[] {
  return [...new Set(result.answers.map((answer) => normalizeAnswer(answer, "TXT")))];
}

/** The value of `name=` in a `tag=value; tag=value` record, lowercased. */
function tagValue(record: string, name: string): string | null {
  const match = record.match(new RegExp(`(?:^|;)\\s*${name}\\s*=\\s*([^;\\s]+)`, "i"));
  return match?.[1]?.toLowerCase() ?? null;
}

function parseDmarc(records: string[]): Dmarc | null {
  const record = records.find((value) => /^v=DMARC1\s*(;|$)/i.test(value));
  if (!record) return null;
  return { record, policy: tagValue(record, "p"), subdomainPolicy: tagValue(record, "sp") };
}

/** `?dkim=s1,google` -> ["s1", "google"]; null when absent, "invalid" when malformed. */
function requestedSelectors(url: URL): string[] | null | "invalid" {
  const param = url.searchParams.get("dkim");
  if (param === null) return null;
  const selectors = [...new Set(param.split(",").map((selector) => selector.trim()))];
  if (selectors.length > MAX_SELECTORS || !selectors.every((s) => SELECTOR.test(s))) {
    return "invalid";
  }
  return selectors;
}

/**
 * GET /security/{domain}: SPF, DMARC, CAA and, for the selectors given in
 * `?dkim=`, DKIM keys, from the primary resolver.
 */
export async function security(ctx: RequestContext): Promise<Response> {
  const domain = targetAfter(ctx, "/security");
  if (!domain) return usage(ctx, "/security/<DOMAIN>?dkim=<SELECTOR>");

  const selectors = requestedSelectors(ctx.url);
  if (selectors === "invalid") {
    return json(
      {
        error: `dkim must be up to ${MAX_SELECTORS} comma-separated selectors made of letters, digits, '-', '_' and '.'`,
      },
      { status: 400, space: ctx.jsonSpace },
    );
  }

  const resolverUrl = primaryResolver(ctx) ?? "";
  const query = (name: string, type: string) => queryResolver(name, type, "Primary", resolverUrl);
  const [txt, dmarcTxt, caa, ...dkimTxt] = await Promise.all([
    query(domain, "TXT"),
    query(`_dmarc.${domain}`, "TXT"),
    query(domain, "CAA"),
    ...(selectors ?? []).map((selector) => query(`${selector}._domainkey.${domain}`, "TXT")),
  ]);

  let dkim: SecurityPosture["dkim"] = null;
  if (selectors) {
    dkim = Object.fromEntries(
      selectors.map((selector, index) => {
        const records = dkimTxt[index] ? txtRecords(dkimTxt[index]) : [];
        // `v=DKIM1` is optional; a key record is recognised by its `p=` tag.
        return [selector, records.find((record) => /(?:^|;)\s*p\s*=/i.test(record)) ?? null];
      }),
    );
  }

  const posture: SecurityPosture = {
    domain,
    spf: txtRecords(txt).filter((record) => /^v=spf1(\s|$)/i.test(record)),
    dmarc: parseDmarc(txtRecords(dmarcTxt)),
    dkim,
    caa: [...new Set(caa.answers.map((answer) => answer.data.trim()))],
  };
  return json(posture, { space: ctx.jsonSpace });
}
