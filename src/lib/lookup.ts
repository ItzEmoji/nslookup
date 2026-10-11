import { queryResolver, type ResolverResult, type Resolvers, type TypeResult } from "./dns.ts";
import { ipv4ToArpa, ipv6ToArpa, isIPv4, isIPv6 } from "./domain.ts";

export interface QueryPlan {
  /** The name sent to the resolvers: the domain, or the reverse name for an IP. */
  name: string;
  types: string[];
  isReverse: boolean;
}

/** IPs become PTR lookups on their reverse name; domains are queried for `forwardTypes`. */
export function planQuery(target: string, forwardTypes: string[]): QueryPlan {
  if (isIPv4(target)) return { name: ipv4ToArpa(target), types: ["PTR"], isReverse: true };
  if (isIPv6(target)) return { name: ipv6ToArpa(target), types: ["PTR"], isReverse: true };
  return { name: target, types: forwardTypes, isReverse: false };
}

/** Queries every resolver for every planned type in parallel; results grouped by type. */
export async function queryAllResolvers(
  plan: QueryPlan,
  resolvers: Resolvers,
): Promise<Record<string, ResolverResult[]>> {
  const queries = plan.types.flatMap((type) =>
    Object.entries(resolvers).map(async ([resolver, url]) => ({
      type,
      result: await queryResolver(plan.name, type, resolver, url),
    })),
  );
  const grouped: Record<string, ResolverResult[]> = {};
  for (const { type, result } of await Promise.all(queries)) {
    grouped[type] ??= [];
    grouped[type].push(result);
  }
  return grouped;
}

/** Answers keyed by resolver name; a later result from the same resolver wins. */
export function answersByResolver(results: ResolverResult[]): TypeResult["resolvers"] {
  return Object.fromEntries(results.map((result) => [result.resolver, result.answers]));
}
