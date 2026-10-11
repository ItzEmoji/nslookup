import { primaryResolver, type RequestContext, targetAfter, usage } from "../context.ts";
import { isListedOnSpamhaus } from "../lib/abuse.ts";
import { json } from "../lib/http.ts";

/** GET /abuse/{domain-or-ip}: `true` when Spamhaus lists the target. */
export async function abuse(ctx: RequestContext): Promise<Response> {
  const target = targetAfter(ctx, "/abuse");
  if (!target) return usage(ctx, "/abuse/<DOMAIN>");

  const resolverUrl = ctx.url.searchParams.get("resolver") || primaryResolver(ctx);
  return json(await isListedOnSpamhaus(target, resolverUrl));
}
