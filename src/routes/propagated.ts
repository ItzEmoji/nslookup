import { type RequestContext, targetAfter } from "../context.ts";
import { isPropagated, type TypeResult } from "../lib/dns.ts";
import { json, text } from "../lib/http.ts";
import { answersByResolver, planQuery, queryAllResolvers } from "../lib/lookup.ts";

/** Records whose agreement across resolvers indicates propagation. */
const PROPAGATION_TYPES = ["A", "AAAA", "MX", "TXT", "NS"];

/** GET /propagated/{domain-or-ip}: `true` when all resolvers agree. */
export async function propagated(ctx: RequestContext): Promise<Response> {
  const target = targetAfter(ctx, "/propagated");
  if (!target) return text("Usage: curl ${url.origin}/propagated/<DOMAIN>\n", 400);

  const plan = planQuery(target, PROPAGATION_TYPES);
  const raw = await queryAllResolvers(plan, ctx.resolvers);
  const results: Record<string, TypeResult> = {};
  for (const [type, typeResults] of Object.entries(raw)) {
    results[type] = { resolvers: answersByResolver(typeResults) };
  }
  return json(isPropagated(results, plan.types));
}
