import { describe, expect, test } from "bun:test";
import { handleRequest } from "../src/router.ts";
import { mockFetch, requestedUrls } from "./support/mock-fetch.ts";

const CURL = { "user-agent": "curl/8.5.0", accept: "*/*" };

const get = (path: string) =>
  handleRequest(new Request(`https://lookup.test${path}`, { headers: CURL }));

/** DoH answers by query name and type, in Cloudflare's quoted-TXT style. */
function mockZone(zone: Record<string, string[]>) {
  return mockFetch((url) => {
    const key = `${url.searchParams.get("name")} ${url.searchParams.get("type")}`;
    const values = zone[key] ?? [];
    return Response.json({
      Status: 0,
      Answer: values.map((data) => ({
        name: url.searchParams.get("name"),
        type: 16,
        TTL: 300,
        data,
      })),
    });
  });
}

describe("GET /security/{domain}", () => {
  test("reports SPF, DMARC and CAA, unquoted", async () => {
    mockZone({
      "example.com TXT": ['"v=spf1 include:_spf.example.net -all"', '"google-site-verification=x"'],
      "_dmarc.example.com TXT": ['"v=DMARC1; p=Reject; sp=none; rua=mailto:d@example.com"'],
      "example.com CAA": ['0 issue "letsencrypt.org"'],
    });

    expect(await (await get("/security/example.com")).json()).toEqual({
      domain: "example.com",
      spf: ["v=spf1 include:_spf.example.net -all"],
      dmarc: {
        record: "v=DMARC1; p=Reject; sp=none; rua=mailto:d@example.com",
        policy: "reject",
        subdomainPolicy: "none",
      },
      dkim: null,
      caa: ['0 issue "letsencrypt.org"'],
    });
  });

  test("lists every SPF record, so a second one is visible", async () => {
    mockZone({ "example.com TXT": ['"v=spf1 -all"', '"v=spf1 include:x.test ~all"'] });
    const body = (await (await get("/security/example.com")).json()) as { spf: string[] };
    expect(body.spf).toHaveLength(2);
  });

  test("joins TXT strings split by the resolver", async () => {
    mockZone({ "_dmarc.example.com TXT": ['"v=DMARC1; p=quar" "antine"'] });
    const body = (await (await get("/security/example.com")).json()) as {
      dmarc: { policy: string };
    };
    expect(body.dmarc.policy).toBe("quarantine");
  });

  test("is empty, not an error, when nothing is published", async () => {
    mockZone({});
    expect(await (await get("/security/example.com")).json()).toEqual({
      domain: "example.com",
      spf: [],
      dmarc: null,
      dkim: null,
      caa: [],
    });
  });

  test("looks up DKIM keys for the selectors asked for", async () => {
    const fake = mockZone({
      "s1._domainkey.example.com TXT": ['"v=DKIM1; k=rsa; p=MIIBIjAN"'],
    });
    const body = (await (await get("/security/example.com?dkim=s1,google")).json()) as {
      dkim: Record<string, string | null>;
    };
    expect(body.dkim).toEqual({ s1: "v=DKIM1; k=rsa; p=MIIBIjAN", google: null });
    expect(requestedUrls(fake).map((url) => new URL(url).searchParams.get("name"))).toContain(
      "google._domainkey.example.com",
    );
  });

  test.each(["s1/../x", "a,b,c,d,e,f,g,h,i,j,k", "bad selector"])(
    "rejects the malformed selector list %p without querying",
    async (selectors) => {
      const fake = mockZone({});
      const res = await get(`/security/example.com?dkim=${encodeURIComponent(selectors)}`);
      expect(res.status).toBe(400);
      expect(requestedUrls(fake)).toEqual([]);
    },
  );
});
