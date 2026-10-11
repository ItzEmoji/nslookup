# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is an operator (sysadmin, SRE or on-call engineer) in the middle of an incident: a domain that stopped resolving, mail that bounces, a migration whose records have not propagated, or a certificate that looks wrong. They are under time pressure. They need a fast answer they can trust and act on, often while switching between the browser and a terminal.

People who self-host their own deployment are a second audience. They use the same app and also care about configuring it: their own resolvers, an RDAP server and API keys.

## Product Purpose

nslookup answers "what does the internet currently believe about this domain or IP?" in a single lookup. It queries several DNS-over-HTTPS resolvers in parallel and reports where they agree, along with registry (WHOIS/RDAP), Spamhaus listing, SSL certificate history, email security (SPF, DMARC, DKIM, CAA) and historical A records.

Success means the operator can find the cause, or rule one out, without opening a second tool, and can reproduce what they saw from the command line.

## Positioning

- **One URL for browser and terminal.** The same address serves the web app to a browser and plain text or JSON to `curl`. What someone sees in the app can be repeated in a shell or a script.
- **Multi-resolver consensus.** The app does not trust a single resolver. It shows per-type consensus and whether all resolvers agree (propagation).
- **Everything in one lookup.** DNS, WHOIS/RDAP, abuse listing, SSL, email security posture and history are combined in one result.
- **Self-hostable and stateless.** It is a single Cloudflare Worker with no storage and no tracking, deployable to your own account with one button. Resolvers can be swapped per request.

## Operating Context

- An official public instance exists alongside self-hosted deployments. Its URL is not recorded here yet.
- The app is used next to a terminal. The CLI reference (`/help`, `/help.txt`) and an interactive API playground (`/api-docs`) are part of the product, and the examples on those pages use the deployment's own origin so they can be copied and pasted.
- The app is keyboard-driven: Ctrl+K to search, Ctrl+, for settings, Enter to run a lookup, Esc to close.
- Lookups can be shared and repeated: browser navigations are redirected to `/?domain=...`, and query history is kept in the browser.

## Capabilities and Constraints

- Endpoints: `/{domain}`, `/{ip}` (PTR), `/ip/`, `/ipv4/`, `/ipv6/`, `/whois/`, `/abuse/`, `/propagated/`, `/ssl/`, `/security/`, `/history/`, `/help`, `/api-docs`. Every API endpoint accepts `?resolvers=` and `?preview`.
- Upstream services: Cloudflare and Google DoH by default (user-configurable), rdap.org by default, Spamhaus, CertSpotter or crt.sh, and SecurityTrails (needs the user's own API key).
- The web app supports theme and accent presets, font choice, feature toggles (WHOIS, security, SSL, animations), default record types, resolver management, a resolver timeout, and an IP info modal with a map.
- Technical constraints: the app is plain HTML, CSS and browser JS in `src/pages/`, with no framework and no client build step. At build time the pages are inlined into a single `dist/worker.js`. Settings and history live only in `localStorage`, and there is no server-side state.
- The app runs on whatever origin it is deployed to, so it must not hard-code a host.

## Brand Commitments

- The name is "nslookup" (the repository and Worker). The app's page title currently uses "lookup".
- The voice in the docs is plain and technical. It names exact endpoints and shows real commands, with no marketing language.

## Evidence on Hand

- Real product facts: the endpoint table in `README.md`, the architecture in `docs/architecture.md`, and the help and API docs pages in `src/pages/`.
- There are no testimonials, user counts, uptime figures, benchmarks or pricing. None of these may be invented.

## Product Principles

1. **The answer comes first.** Under incident pressure, the state of the domain (agree or disagree, listed or clean, valid or expired) must be visible before any detail.
2. **Show your sources.** Consensus is only useful when the operator can see which resolver said what and spot the one that disagrees.
3. **The browser and the terminal are equals.** Everything the app shows should map to a URL someone can `curl`, and the app should make that path easy to find.
4. **Stateless and portable.** No accounts, no tracking, nothing that only works on the official instance. A self-hosted deployment must get the same experience.
5. **Dense, not cluttered.** Experts want a lot of information on screen. Organize it so it can be scanned, rather than hiding it behind extra steps.
