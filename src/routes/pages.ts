import { isCliClient, type RequestContext } from "../context.ts";
import { html, reply } from "../lib/http.ts";
import { apiDocsPage, helpPage, helpText } from "../pages/index.ts";

/** GET /help: a man page for terminals, an HTML reference for browsers. */
export function help(ctx: RequestContext): Response {
  const { origin } = ctx.url;
  if (isCliClient(ctx.request)) {
    return reply(helpText(origin), { contentType: "text/plain" });
  }
  return html(helpPage(origin));
}

/** GET /api-docs: interactive API playground. */
export function apiDocs(ctx: RequestContext): Response {
  return html(apiDocsPage(ctx.url.origin), { cors: false });
}
