import { DEFAULT_RESOLVERS, type Resolvers } from "./lib/dns.ts";

/** Everything a route needs, derived once per request. */
export interface RequestContext {
  request: Request;
  url: URL;
  /** Resolvers to query: the defaults, or `Custom1..n` from `?resolvers=`. */
  resolvers: Resolvers;
  /** JSON indentation; `?preview` pretty-prints responses. */
  jsonSpace: number | undefined;
  /** True for API clients (curl, fetch, JSON accept), false for browser navigation. */
  wantsApi: boolean;
}

const CLI_USER_AGENT = /curl|wget|httpie/i;

export function isCliClient(request: Request): boolean {
  return CLI_USER_AGENT.test(request.headers.get("user-agent") ?? "");
}

/**
 * The same URL serves the web app to browsers and JSON to everything else,
 * so the client is classified from its request headers.
 */
function wantsApiResponse(request: Request): boolean {
  const fetchMode = request.headers.get("sec-fetch-mode");
  const accept = request.headers.get("accept");
  const isNavigation = fetchMode === "navigate" || accept?.includes("text/html") === true;
  if (isNavigation) return false;
  return (
    isCliClient(request) ||
    fetchMode === "cors" ||
    accept?.includes("application/json") === true ||
    request.headers.get("referer")?.includes("/api-docs") === true
  );
}

function resolversFrom(url: URL): Resolvers {
  const custom = url.searchParams.get("resolvers") || url.searchParams.get("resolver");
  if (!custom) return { ...DEFAULT_RESOLVERS };
  return Object.fromEntries(
    custom.split(",").map((resolverUrl, index) => [`Custom${index + 1}`, resolverUrl.trim()]),
  );
}

export function createContext(request: Request): RequestContext {
  const url = new URL(request.url);
  return {
    request,
    url,
    resolvers: resolversFrom(url),
    jsonSpace: url.searchParams.has("preview") ? 2 : undefined,
    wantsApi: wantsApiResponse(request),
  };
}

/**
 * The lowercased target after a route prefix (`/whois/Example.com` -> `example.com`),
 * falling back to `?domain=`.
 */
export function targetAfter(ctx: RequestContext, prefix: string): string | undefined {
  const fromPath = ctx.url.pathname.slice(prefix.length).replace(/^\//, "").toLowerCase();
  return fromPath || ctx.url.searchParams.get("domain")?.toLowerCase() || undefined;
}

/** The first configured resolver, used where only one lookup is needed. */
export function primaryResolver(ctx: RequestContext): string | undefined {
  return Object.values(ctx.resolvers)[0];
}
