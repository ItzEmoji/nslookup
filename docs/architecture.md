# Architecture

nslookup is a single Cloudflare Worker. It has no storage and no state: every
request fans out to public DNS-over-HTTPS resolvers and data providers, then
combines their answers.

## Request flow

```
Request
  └─ src/index.ts          Worker entry point
      └─ src/router.ts     Classifies the client, picks a route
          ├─ browser?  →  web app (src/pages/), or a redirect to /?domain=...
          └─ API?      →  src/routes/<endpoint>.ts
                             └─ src/lib/*  DNS, domain, Spamhaus logic
                                 └─ fetch() to resolvers / RDAP / CT logs
```

**Browser or API client?** The same URL serves both, so `src/context.ts`
decides from the request headers. A navigation (`Sec-Fetch-Mode: navigate`
or `Accept: text/html`) gets the web app. Every other request gets the API:
`curl`, `fetch()`, HTTP libraries, Postman and clients generated from
`/openapi.json` need no particular headers.

## Layout

| Path | Contents |
| --- | --- |
| `src/index.ts` | Entry point; exports the fetch handler. |
| `src/router.ts` | Route table and dispatch order. Start here. |
| `src/context.ts` | Per-request context: parsed URL, resolvers, client type. |
| `src/routes/` | One file per endpoint. Validates input, calls `lib/`, shapes the response. |
| `src/lib/` | Pure logic with no knowledge of routes: DoH queries, consensus, propagation, domain parsing, Spamhaus. Unit-tested. |
| `src/pages/` | The web app (`app/`) and the help and API docs pages, as real HTML/CSS/JS files. |
| `scripts/build.ts` | Bun build: bundles `src/` and inlines the page files into `dist/worker.js`. |
| `test/` | `bun test` suites. `test/support/mock-fetch.ts` stubs the network. |

## Pages

The pages are plain files so they get syntax highlighting and formatting.
They are imported as text (`import x from "./x.html" with { type: "text" }`)
and inlined into the bundle at build time, so the deployed worker is a single
file.

- `app/index.html` contains `<!-- inline:styles.css -->` and
  `<!-- inline:app.js -->` markers; `src/pages/index.ts` replaces them with
  the stylesheet and script.
- `help.html`, `help.txt` and `api-docs.html` contain `{{ORIGIN}}`, replaced
  per request with the worker's own origin so the examples are copy-pasteable.

The web app script (`app/app.js`) is plain browser JavaScript and runs as-is.
Its functions are called from inline `onclick=` handlers, so it is excluded
from linting (see `biome.jsonc`) but still formatted.

## Build and deploy

`bun run build` produces `dist/worker.js`. wrangler is configured with
`"no_bundle": true`, so it deploys exactly that file. `wrangler dev`,
`wrangler deploy` and `wrangler preview` run the build first (`"build"` in
`wrangler.jsonc`).

`bun run preview` creates a [Preview deployment](https://developers.cloudflare.com/workers/wrangler/configuration/#previews)
named after the current git branch, with its own URL, without touching
production. Preview-only settings live under `"previews"` in `wrangler.jsonc`.
