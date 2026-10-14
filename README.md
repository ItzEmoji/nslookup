# nslookup

DNS, WHOIS and domain intelligence lookups, running as a Cloudflare Worker.
The same URL serves a web app to browsers and JSON or plain text to `curl`.

A public instance runs at [lookup.itzemoji.com](https://lookup.itzemoji.com):

```console
$ curl https://lookup.itzemoji.com/example.com          # every record, consensus, WHOIS
$ curl https://lookup.itzemoji.com/ipv4/example.com     # 93.184.215.14
$ curl https://lookup.itzemoji.com/openapi.json         # every endpoint, as OpenAPI 3.1
```

To run your own, deploy it to your Cloudflare account:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/itzemoji/nslookup)

## Endpoints

| Endpoint | Returns |
| --- | --- |
| `GET /` | The caller's IP address (plain text). |
| `GET /{domain}` | All DNS records from every resolver, with a per-type consensus, propagation, Spamhaus and WHOIS status. `?type=TXT,MX` narrows the record types, `?whois=false` skips WHOIS. |
| `GET /{ip}` | Reverse (PTR) lookup. |
| `GET /ip/{domain}` | IPv4 and IPv6 addresses as JSON. |
| `GET /ipv4/{domain}`, `/ipv6/{domain}` | The first address, as plain text. |
| `GET /whois/{domain}` | Raw RDAP data. |
| `GET /abuse/{domain-or-ip}` | `true` if listed on Spamhaus. |
| `GET /propagated/{domain}` | `true` if all resolvers agree. |
| `GET /ssl/{domain}` | Certificate history (`?provider=certspotter` or `crt.sh`). |
| `GET /security/{domain}` | SPF, DMARC and CAA records; `?dkim=<selector>,...` adds DKIM keys. |
| `GET /api-docs` | API reference drawn from `/openapi.json`, with a request runner. |
| `GET /openapi.json` | OpenAPI 3.1 description of every endpoint, with the deployment's own URL as its server. |

Every API endpoint accepts `?resolvers=<url>,<url>` to query your own
DNS-over-HTTPS resolvers instead of Cloudflare and Google, and `?preview` (or
`?preview=true`) to pretty-print JSON; responses are compact otherwise.

Browser page navigations get the web app; every other request gets the API,
so HTTP libraries, Postman and generated clients work without extra headers.

### OpenAPI

Import `https://<your-worker>/openapi.json` into Postman, Insomnia or Bruno,
or generate a client from it:

```sh
bunx @openapitools/openapi-generator-cli generate \
  -i https://<your-worker>/openapi.json -g typescript-fetch -o ./nslookup-client
```

The document lives in [`src/openapi.ts`](src/openapi.ts). `test/openapi.test.ts`
calls every documented operation, so the spec fails CI when it drifts from the
routes.

## Development

You need [Bun](https://bun.sh) 1.4 or newer.

```sh
bun install      # installs dependencies and the git hooks
bun run dev      # local worker on http://localhost:8787, rebuilds on change
```

| Script | What it does |
| --- | --- |
| `bun run dev` | Run the worker locally with wrangler. |
| `bun run build` | Bundle the worker into `dist/worker.js`. |
| `bun test` | Run the test suite. |
| `bun run typecheck` | Type-check the worker and the tests. |
| `bun run check` / `bun run fix` | Check / fix formatting and lint with Biome. |
| `bun run verify` | Everything CI runs: format, lint, typecheck, test, build. |
| `bun run preview` | Build and create a Preview deployment for the current branch. |
| `bun run deploy` | Build and deploy to your Cloudflare account. |

How the code is organized: [docs/architecture.md](docs/architecture.md).
How to contribute, commit and release: [CONTRIBUTING.md](CONTRIBUTING.md).

## Releases

Releases are cut by [release-please](https://github.com/googleapis/release-please)
from [Conventional Commits](https://www.conventionalcommits.org/) on `main`.
Merging a release pull request tags the version and publishes the GitHub
release with the built bundle. See [CHANGELOG.md](CHANGELOG.md).

## License
This project is licensed under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html). For more information, see the [LICENSE.md](LICENSE.md) file. 

