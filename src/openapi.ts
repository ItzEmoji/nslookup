import pkg from "../package.json" with { type: "json" };

/**
 * OpenAPI 3.1 description of the public API, served at GET /openapi.json.
 * `servers` is the deployment's own origin, so the document can be imported
 * into Postman, Insomnia or a client generator as-is.
 *
 * Keep it in step with src/router.ts and src/routes/: test/openapi.test.ts
 * calls every documented operation and checks the status and content type.
 */

const RECORD_TYPES = [
  "A",
  "AAAA",
  "CAA",
  "CNAME",
  "DNSKEY",
  "DS",
  "HTTPS",
  "MX",
  "NAPTR",
  "NS",
  "PTR",
  "SOA",
  "SRV",
  "SSHFP",
  "SVCB",
  "TLSA",
  "TXT",
] as const;

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const param = (name: string) => ({ $ref: `#/components/parameters/${name}` });
const nullable = (schema: object) => ({ oneOf: [schema, { type: "null" }] });

const json = (schema: object, example?: unknown) => ({
  "application/json": { schema, ...(example === undefined ? {} : { example }) },
});
const plainText = (example: string) => ({
  "text/plain": { schema: { type: "string" }, example },
});

const domainPath = (description = "Domain name, e.g. `example.com`.") => ({
  name: "domain",
  in: "path",
  required: true,
  description,
  schema: { type: "string" },
  example: "example.com",
});

const targetPath = {
  name: "target",
  in: "path",
  required: true,
  description: "Domain name or IPv4/IPv6 address.",
  schema: { type: "string" },
  example: "example.com",
};

export function openApiDocument(origin: string) {
  // Returned when the path has no target, e.g. GET /ip/ or GET /whois.
  const badRequest = {
    description: "The target is missing.",
    content: plainText(`Usage: curl ${origin}/ip/<DOMAIN>\n`),
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "nslookup",
      version: pkg.version,
      summary: "DNS, WHOIS and domain intelligence lookups.",
      description: [
        "Queries several DNS-over-HTTPS resolvers in parallel and reports where they agree,",
        "together with RDAP registration data, Spamhaus listing, certificate history and email",
        "security records. The service is stateless: nothing is stored or logged.",
        "",
        "The same URLs serve a web app to browsers. Any request that isn't a browser page",
        "navigation (`Accept: text/html` or `Sec-Fetch-Mode: navigate`) gets the API response.",
        "",
        "Every endpoint is CORS-enabled (`Access-Control-Allow-Origin: *`) and needs no key.",
      ].join("\n"),
      license: { name: "See repository", url: "https://github.com/itzemoji/nslookup" },
    },
    externalDocs: {
      description: "Interactive playground",
      url: `${origin}/api-docs`,
    },
    servers: [{ url: origin }],
    // Public: no endpoint needs authentication.
    security: [{}],
    tags: [
      { name: "DNS", description: "Record lookups across resolvers." },
      { name: "Domain", description: "Registration, reputation and security posture." },
      { name: "Meta", description: "The caller, documentation and this description." },
    ],
    paths: {
      "/": {
        get: {
          operationId: "getClientIp",
          tags: ["Meta"],
          summary: "Your IP address",
          description: "The IP address the request came from, as seen by Cloudflare.",
          responses: {
            "200": { description: "The caller's IP address.", content: plainText("203.0.113.9\n") },
          },
        },
      },
      "/{target}": {
        get: {
          operationId: "lookup",
          tags: ["DNS"],
          summary: "Full lookup",
          description: [
            "Every requested record type from every resolver, with a per-type consensus,",
            "propagation status, Spamhaus listing and RDAP data in one payload.",
            "An IP address becomes a reverse (PTR) lookup without WHOIS.",
          ].join(" "),
          parameters: [
            targetPath,
            {
              name: "type",
              in: "query",
              description:
                "Comma-separated record types to query. `ALL` or omitted: A, AAAA, MX, TXT, NS, CAA, CNAME, SOA. `records` is accepted as an alias.",
              schema: { type: "string" },
              example: "A,MX,TXT",
            },
            {
              name: "whois",
              in: "query",
              description: "`false` skips the RDAP lookup.",
              schema: { type: "boolean", default: true },
            },
            {
              name: "resolver",
              in: "query",
              description:
                "DoH resolver URL for the Spamhaus check. Defaults to the first of `resolvers`.",
              schema: { type: "string", format: "uri" },
            },
            param("resolvers"),
            param("preview"),
          ],
          responses: {
            "200": { description: "Lookup result.", content: json(ref("LookupResult")) },
            "400": {
              description: "The target is neither a domain nor an IP address.",
              content: json(ref("Error"), { error: "Invalid domain or IP address format" }),
            },
          },
        },
      },
      "/ip/{domain}": {
        get: {
          operationId: "getAddresses",
          tags: ["DNS"],
          summary: "IPv4 and IPv6 addresses",
          description: "A and AAAA answers merged from every resolver, without duplicates.",
          parameters: [
            domainPath(),
            {
              name: "ipv4",
              in: "query",
              description: "`false` leaves out IPv4 addresses.",
              schema: { type: "boolean", default: true },
            },
            {
              name: "ipv6",
              in: "query",
              description: "`false` leaves out IPv6 addresses.",
              schema: { type: "boolean", default: true },
            },
            param("resolvers"),
            param("preview"),
          ],
          responses: {
            "200": {
              description: "Addresses by IP version.",
              content: json(ref("Addresses"), {
                domain: "example.com",
                ipv4: ["93.184.215.14"],
                ipv6: ["2606:2800:21f:cb07:6820:80da:af6b:8b2c"],
              }),
            },
            "400": badRequest,
          },
        },
      },
      "/ipv4/{domain}": {
        get: {
          operationId: "getFirstIpv4",
          tags: ["DNS"],
          summary: "First IPv4 address",
          description: "The first A record as plain text, for shell scripts.",
          parameters: [domainPath(), param("resolvers")],
          responses: {
            "200": { description: "An IPv4 address.", content: plainText("93.184.215.14\n") },
            "400": badRequest,
            "404": { description: "No A record.", content: plainText("Not found\n") },
          },
        },
      },
      "/ipv6/{domain}": {
        get: {
          operationId: "getFirstIpv6",
          tags: ["DNS"],
          summary: "First IPv6 address",
          description: "The first AAAA record as plain text, for shell scripts.",
          parameters: [domainPath(), param("resolvers")],
          responses: {
            "200": {
              description: "An IPv6 address.",
              content: plainText("2606:2800:21f:cb07:6820:80da:af6b:8b2c\n"),
            },
            "400": badRequest,
            "404": { description: "No AAAA record.", content: plainText("Not found\n") },
          },
        },
      },
      "/propagated/{target}": {
        get: {
          operationId: "isPropagated",
          tags: ["DNS"],
          summary: "Propagation check",
          description: [
            "`true` when every resolver returns the same A, AAAA, MX, TXT and NS answers",
            "(PTR for an IP). Formatting differences such as TXT quoting don't count, and",
            "A/AAAA may differ as long as every resolver returned an address (CDNs, geo-DNS).",
          ].join(" "),
          parameters: [targetPath, param("resolvers")],
          responses: {
            "200": {
              description: "Whether all resolvers agree.",
              content: json({ type: "boolean" }, true),
            },
            "400": badRequest,
          },
        },
      },
      "/whois/{domain}": {
        get: {
          operationId: "getWhois",
          tags: ["Domain"],
          summary: "Registration data (RDAP)",
          description:
            "The RDAP response for the registrable domain (`www.example.com` → `example.com`), from rdap.org, plus `_latency`.",
          parameters: [domainPath(), param("preview")],
          responses: {
            "200": {
              description: "RDAP data, or `error` when the registry didn't answer.",
              content: json(ref("Rdap")),
            },
            "400": badRequest,
          },
        },
      },
      "/abuse/{target}": {
        get: {
          operationId: "isListedOnSpamhaus",
          tags: ["Domain"],
          summary: "Spamhaus listing",
          description:
            "`true` when Spamhaus lists the target: DBL for domains, ZEN for IP addresses. A failed or rate-limited query counts as not listed.",
          parameters: [
            targetPath,
            {
              name: "resolver",
              in: "query",
              description: "DoH resolver URL for the query. Defaults to Cloudflare.",
              schema: { type: "string", format: "uri" },
            },
          ],
          responses: {
            "200": {
              description: "Whether the target is listed.",
              content: json({ type: "boolean" }, false),
            },
            "400": badRequest,
          },
        },
      },
      "/ssl/{domain}": {
        get: {
          operationId: "getCertificates",
          tags: ["Domain"],
          summary: "Certificate history",
          description:
            "Certificate issuances from Certificate Transparency logs, including subdomains. The shape of each entry is the provider's own. An upstream error status returns an empty list.",
          parameters: [
            domainPath(),
            {
              name: "provider",
              in: "query",
              description: "Certificate Transparency source.",
              schema: { type: "string", enum: ["certspotter", "crt.sh"], default: "certspotter" },
            },
            param("preview"),
          ],
          responses: {
            "200": {
              description: "Issuances, in the provider's order.",
              content: json({ type: "array", items: ref("Certificate") }),
            },
            "400": badRequest,
            "500": {
              description: "The provider couldn't be reached or returned invalid JSON.",
              content: json(ref("Error"), { error: "Failed to fetch from certspotter" }),
            },
          },
        },
      },
      "/security/{domain}": {
        get: {
          operationId: "getSecurityPosture",
          tags: ["Domain"],
          summary: "Email and CA security records",
          description: [
            "SPF, DMARC (from `_dmarc.<domain>`) and CAA records from the first resolver, unquoted.",
            "DKIM keys live at `<selector>._domainkey.<domain>` and selectors can't be listed,",
            "so pass the ones to check in `dkim`; find one in a message's DKIM-Signature header (`s=`).",
          ].join(" "),
          parameters: [
            domainPath(),
            {
              name: "dkim",
              in: "query",
              description:
                "Comma-separated DKIM selectors to look up, at most 10. Letters, digits, `-`, `_` and `.`.",
              schema: { type: "string" },
              example: "google,selector1",
            },
            param("resolvers"),
            param("preview"),
          ],
          responses: {
            "200": {
              description: "Security posture.",
              content: json(ref("SecurityPosture"), {
                domain: "example.com",
                spf: ["v=spf1 -all"],
                dmarc: {
                  record: "v=DMARC1;p=reject;sp=reject;adkim=s;aspf=s",
                  policy: "reject",
                  subdomainPolicy: "reject",
                },
                dkim: { google: null },
                caa: [],
              }),
            },
            "400": {
              description:
                "The target is missing (plain-text usage) or `dkim` is malformed (JSON error).",
              content: {
                ...badRequest.content,
                ...json(ref("Error"), {
                  error:
                    "dkim must be up to 10 comma-separated selectors made of letters, digits, '-', '_' and '.'",
                }),
              },
            },
          },
        },
      },
      "/help": {
        get: {
          operationId: "getHelp",
          tags: ["Meta"],
          summary: "Reference",
          description: "A man page for curl, wget and httpie; an HTML page for everything else.",
          responses: {
            "200": {
              description: "The reference.",
              content: {
                "text/plain": { schema: { type: "string" } },
                "text/html": { schema: { type: "string" } },
              },
            },
          },
        },
      },
      "/openapi.json": {
        get: {
          operationId: "getOpenApi",
          tags: ["Meta"],
          summary: "This document",
          parameters: [param("preview")],
          responses: {
            "200": {
              description: "OpenAPI 3.1 description of this API.",
              content: json({ type: "object" }),
            },
          },
        },
      },
    },
    components: {
      parameters: {
        resolvers: {
          name: "resolvers",
          in: "query",
          description:
            "Comma-separated DNS-over-HTTPS JSON endpoints to query instead of Cloudflare and Google. They are named `Custom1`, `Custom2`, … in the response.",
          schema: { type: "string" },
          example: "https://cloudflare-dns.com/dns-query,https://dns.quad9.net:5053/dns-query",
        },
        preview: {
          name: "preview",
          in: "query",
          description: "Present (any value) to pretty-print the JSON.",
          allowEmptyValue: true,
          schema: { type: "string" },
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: { error: { type: "string" } },
        },
        RecordType: {
          type: "string",
          description: "DNS record type mnemonic. Others are passed to the resolvers as given.",
          examples: [...RECORD_TYPES],
        },
        DnsAnswer: {
          type: "object",
          description: "One record from a resolver's DoH JSON `Answer`, unchanged.",
          required: ["data"],
          properties: {
            name: { type: "string", example: "example.com." },
            type: {
              type: "integer",
              description: "Numeric record type (1 = A, 16 = TXT, …).",
              example: 1,
            },
            TTL: { type: "integer", example: 300 },
            data: {
              type: "string",
              description: "Record data in the resolver's own formatting.",
              example: "93.184.215.14",
            },
          },
        },
        Consensus: {
          type: "object",
          description:
            "The answer returned by the most resolvers. Answers are compared after normalizing TXT quoting, case and trailing dots; `value` is the first resolver's original text.",
          required: ["value", "confirmedBy"],
          properties: {
            value: { type: "string", example: "93.184.215.14" },
            confirmedBy: {
              type: "array",
              items: { type: "string" },
              example: ["Cloudflare", "Google"],
            },
          },
        },
        TypeLookup: {
          type: "object",
          required: ["consensus", "resolvers"],
          properties: {
            consensus: nullable(ref("Consensus")),
            resolvers: {
              type: "object",
              description:
                "Answers by resolver name. A resolver that failed has an empty list here.",
              additionalProperties: { type: "array", items: ref("DnsAnswer") },
            },
          },
        },
        LookupResult: {
          type: "object",
          required: [
            "target",
            "isReverseSearch",
            "records_queried",
            "propagated",
            "abuse",
            "dns",
            "whois",
          ],
          properties: {
            target: { type: "string", example: "example.com" },
            isReverseSearch: {
              type: "boolean",
              description: "True when the target was an IP address and PTR was queried.",
            },
            records_queried: { type: "array", items: ref("RecordType") },
            propagated: {
              type: "boolean",
              description: "Same rule as `GET /propagated/{target}`.",
            },
            abuse: { type: "boolean", description: "Listed on Spamhaus." },
            dns: {
              type: "object",
              description: "Results by record type.",
              additionalProperties: ref("TypeLookup"),
            },
            whois: ref("Rdap"),
          },
        },
        Addresses: {
          type: "object",
          required: ["domain"],
          properties: {
            domain: { type: "string" },
            ipv4: { type: "array", items: { type: "string", format: "ipv4" } },
            ipv6: { type: "array", items: { type: "string", format: "ipv6" } },
          },
        },
        Rdap: {
          type: "object",
          description: [
            "The registry's RDAP domain object (RFC 9083), unchanged, plus `_latency`.",
            'On failure only `error` is set; `{ "error": "Skipped" }` when WHOIS was not requested.',
          ].join(" "),
          additionalProperties: true,
          properties: {
            ldhName: { type: "string", example: "EXAMPLE.COM" },
            status: { type: "array", items: { type: "string" } },
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  eventAction: { type: "string", example: "expiration" },
                  eventDate: { type: "string", format: "date-time" },
                },
              },
            },
            nameservers: {
              type: "array",
              items: { type: "object", properties: { ldhName: { type: "string" } } },
            },
            _latency: { type: "integer", description: "RDAP response time in milliseconds." },
            error: { type: "string", example: "HTTP 404" },
          },
        },
        Certificate: {
          type: "object",
          description:
            "One issuance in the provider's format: certspotter (`dns_names`, `not_before`, `not_after`, `issuer`) or crt.sh (`name_value`, `issuer_name`, `not_before`, `not_after`).",
          additionalProperties: true,
          properties: {
            dns_names: { type: "array", items: { type: "string" } },
            name_value: { type: "string" },
            issuer_name: { type: "string" },
            issuer: { type: "object", additionalProperties: true },
            not_before: { type: "string" },
            not_after: { type: "string" },
          },
        },
        SecurityPosture: {
          type: "object",
          required: ["domain", "spf", "dmarc", "dkim", "caa"],
          properties: {
            domain: { type: "string" },
            spf: {
              type: "array",
              items: { type: "string" },
              description:
                "Every SPF record at the domain, unquoted. Empty: no SPF. More than one: receivers treat SPF as a permanent error.",
            },
            dmarc: nullable(ref("Dmarc")),
            dkim: {
              description:
                "Key record by selector, unquoted; null for a selector with no key. An empty `p=` means the key was revoked. The whole field is null when `dkim` wasn't given.",
              oneOf: [
                { type: "object", additionalProperties: nullable({ type: "string" }) },
                { type: "null" },
              ],
            },
            caa: {
              type: "array",
              items: { type: "string" },
              description: "CAA records. Empty: any certificate authority may issue.",
            },
          },
        },
        Dmarc: {
          type: "object",
          description: "The DMARC record at `_dmarc.<domain>`.",
          required: ["record", "policy", "subdomainPolicy"],
          properties: {
            record: { type: "string", description: "The record, unquoted." },
            policy: nullable({
              type: "string",
              description: "`p=`, lowercased: none (monitoring only), quarantine or reject.",
            }),
            subdomainPolicy: nullable({
              type: "string",
              description: "`sp=`, lowercased. Null when subdomains inherit `p=`.",
            }),
          },
        },
      },
    },
  };
}
