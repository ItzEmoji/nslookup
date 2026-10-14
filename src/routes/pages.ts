import type { RequestContext } from "../context.ts";
import { html } from "../lib/http.ts";
import { apiDocsPage } from "../pages/index.ts";

/** GET /api-docs: the API reference, drawn from /openapi.json in the browser. */
export function apiDocs(ctx: RequestContext): Response {
  return html(apiDocsPage(ctx.url.origin), { cors: false });
}
