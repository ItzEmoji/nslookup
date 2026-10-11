import { createContext, type RequestContext } from "./context.ts";
import { json, reply } from "./lib/http.ts";
import { openApiDocument } from "./openapi.ts";
import { appPage } from "./pages/index.ts";
import { abuse } from "./routes/abuse.ts";
import { addresses, firstAddress } from "./routes/addresses.ts";
import { history } from "./routes/history.ts";
import { clientIp, lookup } from "./routes/lookup.ts";
import { apiDocs, help } from "./routes/pages.ts";
import { propagated } from "./routes/propagated.ts";
import { proxyDns } from "./routes/proxy-dns.ts";
import { security } from "./routes/security.ts";
import { ssl } from "./routes/ssl.ts";
import { whois } from "./routes/whois.ts";

type Handler = (ctx: RequestContext) => Response | Promise<Response>;

/** API endpoints served at `/{name}` and `/{name}/{target}`. */
const API_ROUTES: Record<string, Handler> = {
  ip: addresses,
  ipv4: firstAddress(4),
  ipv6: firstAddress(6),
  whois,
  abuse,
  ssl,
  history,
  security,
  propagated,
};

/** Names of the `/{name}/{target}` API routes; test/openapi.test.ts checks each is documented. */
export const API_ROUTE_NAMES = Object.keys(API_ROUTES);

/** Paths the web app renders client-side; any other browser path is treated as a domain. */
const APP_ROUTE = /^\/(ip|ipv4|ipv6|whois|abuse|propagated|ssl|security)(\/.*)?$/;

const PREFLIGHT_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

/** Browsers get the web app; `/example.com` redirects to `/?domain=example.com`. */
function serveApp(ctx: RequestContext): Response {
  const { pathname, origin } = ctx.url;
  if (pathname !== "/" && !APP_ROUTE.test(pathname)) {
    return Response.redirect(`${origin}/?domain=${pathname.slice(1).toLowerCase()}`, 301);
  }
  return reply(appPage, { contentType: "text/html;charset=UTF-8", cors: false });
}

function apiRouteFor(pathname: string): Handler | undefined {
  const name = pathname.split("/")[1] ?? "";
  if (!Object.hasOwn(API_ROUTES, name)) return undefined;
  return API_ROUTES[name];
}

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: PREFLIGHT_HEADERS });
  }

  const ctx = createContext(request);
  const { pathname } = ctx.url;

  if (pathname === "/help") return help(ctx);
  if (pathname === "/api-docs") return apiDocs(ctx);
  // JSON for everyone, browsers included, so the link can be opened or imported as-is.
  if (pathname === "/openapi.json") return json(openApiDocument(ctx.url.origin), { space: 2 });
  if (!ctx.wantsApi) return serveApp(ctx);

  if (pathname === "/proxy-dns") return proxyDns(ctx);
  const route = apiRouteFor(pathname);
  if (route) return route(ctx);

  const target =
    pathname.slice(1).toLowerCase() || ctx.url.searchParams.get("domain")?.toLowerCase();
  if (!target) return clientIp(ctx);
  return lookup(ctx, target);
}
