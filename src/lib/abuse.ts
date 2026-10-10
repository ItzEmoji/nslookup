import { DEFAULT_RESOLVERS } from "./dns.ts";
import { ipv6ToArpa, isIPv4, isIPv6, reverseIPv4 } from "./domain.ts";

/** Spamhaus answers this when the query is rate limited; it says nothing about the target. */
const SPAMHAUS_RATE_LIMITED = "127.255.255.254";

interface DohResponse {
  Answer?: { data: string }[];
}

/** The Spamhaus zone to query: ZEN for IP addresses, DBL for domains. */
export function spamhausQueryName(target: string): string {
  if (isIPv4(target)) return `${reverseIPv4(target)}.zen.spamhaus.org`;
  if (isIPv6(target)) return ipv6ToArpa(target).replace(".ip6.arpa", ".zen.spamhaus.org");
  return `${target}.dbl.spamhaus.org`;
}

/** True when Spamhaus lists the domain or IP. Lookup failures count as "not listed". */
export async function isListedOnSpamhaus(target: string, resolverUrl?: string): Promise<boolean> {
  const url = resolverUrl || DEFAULT_RESOLVERS.Cloudflare;
  try {
    const response = await fetch(`${url}?name=${spamhausQueryName(target)}&type=A`, {
      headers: { accept: "application/dns-json" },
    });
    if (!response.ok) return false;
    const data = (await response.json()) as DohResponse;
    const ip = data.Answer?.[0]?.data;
    return ip?.startsWith("127.") === true && ip !== SPAMHAUS_RATE_LIMITED;
  } catch {
    return false;
  }
}
