import { describe, expect, test } from "bun:test";
import { handleRequest } from "../src/router.ts";
import { dohAnswer, mockFetch, requestedUrls } from "./support/mock-fetch.ts";

const ORIGIN = "https://lookup.test";

const BROWSER = {
  "user-agent": "Mozilla/5.0",
  accept: "text/html,application/xhtml+xml",
  "sec-fetch-mode": "navigate",
};
const CURL = { "user-agent": "curl/8.5.0", accept: "*/*" };

/** The parts of a lookup payload these tests inspect. */
interface LookupBody {
  dns: { A: { consensus: { value: string; confirmedBy: string[] } | null } };
}

const readLookup = async (res: Response) => (await res.json()) as LookupBody;

function get(path: string, headers: Record<string, string> = CURL) {
  return handleRequest(new Request(`${ORIGIN}${path}`, { headers }));
}

/** Answers every DoH query with one record per type; RDAP and Spamhaus answer empty. */
function mockUpstreams() {
  return mockFetch((url) => {
    if (url.hostname === "rdap.org") return Response.json({ ldhName: "example.com" });
    const name = url.searchParams.get("name") ?? "";
    if (name.includes("spamhaus")) return dohAnswer([]);
    return dohAnswer([`${url.searchParams.get("type")}-record`]);
  });
}

describe("browsers", () => {
  test("get the web app at /", async () => {
    const res = await get("/", BROWSER);
    expect(res.headers.get("content-type")).toBe("text/html;charset=UTF-8");
    expect(await res.text()).toContain("<title>nslookup</title>");
  });

  test("get the web app on its client-side routes", async () => {
    const res = await get("/whois/example.com", BROWSER);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toStartWith("text/html");
  });

  test("are redirected from /{domain} to the app's search", async () => {
    const res = await get("/Example.com", BROWSER);
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/?domain=example.com`);
  });

  test("get the API page, which draws itself from /openapi.json", async () => {
    const docs = await (await get("/api-docs", BROWSER)).text();
    expect(docs).toContain(`const BASE_URL = '${ORIGIN}';`);
    expect(docs).toContain('fetch("/openapi.json"');
  });

  test("are sent from the old /help page to the API page", async () => {
    const res = await get("/help", BROWSER);
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/api-docs`);
  });
});

describe("API clients", () => {
  test("CORS preflight", async () => {
    const res = await handleRequest(new Request(`${ORIGIN}/example.com`, { method: "OPTIONS" }));
    expect(res.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
  });

  test("/ returns the caller's IP", async () => {
    const res = await get("/", { ...CURL, "CF-Connecting-IP": "203.0.113.9" });
    expect(await res.text()).toBe("203.0.113.9\n");
  });

  test("/help redirects curl to the API page too", async () => {
    const res = await get("/help");
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/api-docs`);
  });

  test.each([
    ["Postman", { "user-agent": "PostmanRuntime/7.43.0", accept: "*/*" }],
    ["Python requests", { "user-agent": "python-requests/2.32.3", accept: "*/*" }],
    ["a client with no headers at all", {}],
  ])("%s gets the API, not the web app", async (_, headers) => {
    mockUpstreams();
    const res = await get("/ipv4/example.com", headers);
    expect(await res.text()).toBe("A-record\n");
  });

  test("fetch() from another site counts as an API client", async () => {
    mockUpstreams();
    const res = await get("/ipv4/example.com", { "sec-fetch-mode": "cors" });
    expect(await res.text()).toBe("A-record\n");
  });

  test("/{domain} returns DNS, consensus and WHOIS in one payload", async () => {
    const fake = mockUpstreams();
    const res = await get("/Example.com?type=a,mx");
    const body = await readLookup(res);

    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(body).toMatchObject({
      target: "example.com",
      isReverseSearch: false,
      records_queried: ["A", "MX"],
      propagated: true,
      abuse: false,
      whois: { ldhName: "example.com" },
    });
    expect(body.dns.A.consensus).toEqual({
      value: "A-record",
      confirmedBy: ["Cloudflare", "Google"],
    });
    expect(requestedUrls(fake)).toContain("https://dns.google/resolve?name=example.com&type=MX");
  });

  test("an IP turns into a reverse PTR lookup without WHOIS", async () => {
    mockUpstreams();
    const body = await (await get("/1.1.1.1")).json();
    expect(body).toMatchObject({
      isReverseSearch: true,
      records_queried: ["PTR"],
      whois: { error: "Skipped" },
    });
  });

  test("custom resolvers replace the defaults", async () => {
    const fake = mockUpstreams();
    await get("/example.com?type=A&whois=false&resolvers=https://r1.test/q,%20https://r2.test/q");
    const dohHosts = requestedUrls(fake)
      .filter((url) => !url.includes("spamhaus"))
      .map((url) => new URL(url).hostname);
    expect(dohHosts).toEqual(["r1.test", "r2.test"]);
  });

  test("a duplicated record type doesn't crash the lookup", async () => {
    mockUpstreams();
    const res = await get("/example.com?type=A,A");
    expect(res.status).toBe(200);
    expect((await readLookup(res)).dns.A.consensus?.value).toBe("A-record");
  });

  test.each(["/ip", "/ipv4", "/whois", "/abuse", "/ssl", "/security", "/propagated"])(
    "%s without a target shows usage with the real origin",
    async (path) => {
      const res = await get(path);
      expect(res.status).toBe(400);
      expect(await res.text()).toStartWith(`Usage: curl ${ORIGIN}${path}/<DOMAIN>`);
    },
  );

  test("/proxy-dns no longer forwards requests to arbitrary URLs", async () => {
    const fake = mockUpstreams();
    const res = await get("/proxy-dns?url=https://internal.test/q&name=example.com&type=A");
    expect(res.status).toBe(400);
    expect(requestedUrls(fake)).toEqual([]);
  });

  test("/history is gone and never contacts SecurityTrails", async () => {
    const fake = mockUpstreams();
    const res = await get("/history/example.com?apikey=secret");
    expect(res.status).toBe(400);
    expect(requestedUrls(fake).some((url) => url.includes("securitytrails"))).toBe(false);
  });

  test("invalid targets are rejected", async () => {
    const res = await get("/not_a_domain");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid domain or IP address format" });
  });

  test("?preview pretty-prints JSON", async () => {
    mockUpstreams();
    expect(await (await get("/ip/example.com?preview")).text()).toContain('\n  "domain"');
  });
});
