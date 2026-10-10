import { primaryResolver, type RequestContext, targetAfter } from "../context.ts";
import { isListedOnSpamhaus } from "../lib/abuse.ts";
import { json, text } from "../lib/http.ts";

/** GET /abuse/{domain-or-ip}: `true` when Spamhaus lists the target. */
export async function abuse(ctx: RequestContext): Promise<Response> {
  const target = targetAfter(ctx, "/abuse");
  if (!target) return text("Usage: curl ${url.origin}/abuse/<DOMAIN>\n", 400);

  const resolverUrl = ctx.url.searchParams.get("resolver") || primaryResolver(ctx);
  return json(await isListedOnSpamhaus(target, resolverUrl));
}
