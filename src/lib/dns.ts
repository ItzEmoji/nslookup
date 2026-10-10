/** Resolver display name -> DNS-over-HTTPS JSON endpoint. */
export type Resolvers = Record<string, string>;

export const DEFAULT_RESOLVERS: Readonly<Resolvers> = {
  Cloudflare: "https://cloudflare-dns.com/dns-query",
  Google: "https://dns.google/resolve",
};

const QUERY_TIMEOUT_MS = 5000;

/** One record from a DoH JSON `Answer` array. */
export interface DnsAnswer {
  name?: string;
  type?: number;
  TTL?: number;
  data: string;
}

export interface ResolverResult {
  resolver: string;
  answers: DnsAnswer[];
  error: string | null;
}

export interface Consensus {
  value: string;
  confirmedBy: string[];
}

/** Per record type: the answers each resolver returned, keyed by resolver name. */
export interface TypeResult {
  resolvers: Record<string, DnsAnswer[]>;
}

interface DohResponse {
  Status?: number;
  Answer?: DnsAnswer[];
}

const RCODE_ERRORS: Record<number, string> = {
  1: "FORMERR (Format Error)",
  2: "SERVFAIL (Server failed to complete the request)",
  3: "NXDOMAIN (Domain does not exist)",
  4: "NOTIMP (Not Implemented)",
  5: "REFUSED (Query refused)",
};

function describeStatus(status: number | undefined): string | null {
  if (status === undefined || status === 0) return null;
  return RCODE_ERRORS[status] ?? `DNS Error (Status: ${status})`;
}

/** Queries one DoH resolver. Never throws: failures are reported in `error`. */
export async function queryResolver(
  name: string,
  type: string,
  resolver: string,
  resolverUrl: string,
): Promise<ResolverResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
  try {
    const response = await fetch(`${resolverUrl}?name=${name}&type=${type}`, {
      headers: { accept: "application/dns-json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as DohResponse;
    return { resolver, answers: data.Answer ?? [], error: describeStatus(data.Status) };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return {
      resolver,
      answers: [],
      error: error.name === "AbortError" ? "Timeout" : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Queries every resolver for one type and merges the answers, deduplicated, in resolver order. */
export async function collectAnswerData(
  name: string,
  type: string,
  resolvers: Resolvers,
): Promise<string[]> {
  const results = await Promise.all(
    Object.entries(resolvers).map(([resolver, url]) => queryResolver(name, type, resolver, url)),
  );
  return [...new Set(results.flatMap((result) => result.answers.map((answer) => answer.data)))];
}

/** The answer value returned by the most resolvers, or null when nobody answered. */
export function buildConsensus(results: ResolverResult[]): Consensus | null {
  const votes = new Map<string, string[]>();
  for (const result of results) {
    for (const answer of result.answers) {
      const voters = votes.get(answer.data) ?? [];
      voters.push(result.resolver);
      votes.set(answer.data, voters);
    }
  }
  let best: Consensus | null = null;
  for (const [value, confirmedBy] of votes) {
    if (!best || confirmedBy.length > best.confirmedBy.length) best = { value, confirmedBy };
  }
  return best;
}

/**
 * True when every resolver returned the same answer set for every queried type.
 *
 * A/AAAA records are allowed to differ as long as every resolver returned
 * something: geo-DNS and CDNs routinely hand out different addresses.
 */
export function isPropagated(
  results: Partial<Record<string, TypeResult>>,
  types: readonly string[],
): boolean {
  for (const type of types) {
    const result = results[type];
    if (!result) continue;

    const answerSets = Object.values(result.resolvers).map((answers) =>
      answers
        .map((answer) => answer.data)
        .sort()
        .join("|"),
    );
    if (answerSets.length < 2) continue;

    const allMatch = answerSets.every((set) => set === answerSets[0]);
    if (allMatch) continue;

    const isAddressType = type === "A" || type === "AAAA";
    if (isAddressType && answerSets.every((set) => set.length > 0)) continue;

    return false;
  }
  return true;
}
