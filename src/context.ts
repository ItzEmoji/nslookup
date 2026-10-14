import { DEFAULT_RESOLVERS, type Resolvers } from "./lib/dns.ts";
import { text } from "./lib/http.ts";

/** Everything a route needs, derived once per request. */
export interface RequestContext {
  request: Request;
  url: URL;
  /** Resolvers to query: the defaults, or `Custom1..n` from `?resolvers=`. */
  resolvers: Resolvers;
  /** JSON indentation; `?preview` or `?preview=true` pretty-prints responses. */
  jsonSpace: number | undefined;
  /** True for API clients (curl, fetch, JSON accept), false for browser navigation. */
  wantsApi: boolean;
}

/**
 * The same URL serves the web app to browsers and the API to everything else,
 * so the client is classified from its request headers. Only a browser page
 * navigation gets the app; scripts, HTTP libraries, generated clients and
 * Postman get the API without having to send a particular Accept header.
 */
function wantsApiResponse(request: Request): boolean {
  const fetchMode = request.headers.get("sec-fetch-mode");
  const accept = request.headers.get("accept");
  const isNavigation = fetchMode === "navigate" || accept?.includes("text/html") === true;
  return !isNavigation;
}

function resolversFrom(url: URL): Resolvers {
  const custom = url.searchParams.get("resolvers") || url.searchParams.get("resolver");
  if (!custom) return { ...DEFAULT_RESOLVERS };
  return Object.fromEntries(
    custom.split(",").map((resolverUrl, index) => [`Custom${index + 1}`, resolverUrl.trim()]),
  );
}

/** `?preview` and `?preview=true` pretty-print; `?preview=false` or `0` don't. */
function wantsPreview(url: URL): boolean {
  const value = url.searchParams.get("preview");
  return value !== null && !["false", "0"].includes(value.toLowerCase());
}

export function createContext(request: Request): RequestContext {
  const url = new URL(request.url);
  return {
    request,
    url,
    resolvers: resolversFrom(url),
    jsonSpace: wantsPreview(url) ? 2 : undefined,
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

/** 400 response showing how to call an endpoint, e.g. `usage(ctx, "/ip/<DOMAIN>")`. */
export function usage(ctx: RequestContext, pattern: string): Response {
  return text(`Usage: curl ${ctx.url.origin}${pattern}\n`, 400);
}

/** The first configured resolver, used where only one lookup is needed. */
export function primaryResolver(ctx: RequestContext): string | undefined {
  return Object.values(ctx.resolvers)[0];
}
