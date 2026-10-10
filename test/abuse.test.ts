import { describe, expect, test } from "bun:test";
import { isListedOnSpamhaus, spamhausQueryName } from "../src/lib/abuse.ts";
import { dohAnswer, mockFetch, requestedUrls } from "./support/mock-fetch.ts";

describe("spamhausQueryName", () => {
  test("domains go to the DBL", () => {
    expect(spamhausQueryName("example.com")).toBe("example.com.dbl.spamhaus.org");
  });

  test("IPv4 addresses are reversed into ZEN", () => {
    expect(spamhausQueryName("127.0.0.2")).toBe("2.0.0.127.zen.spamhaus.org");
  });

  test("IPv6 addresses are nibble-reversed into ZEN", () => {
    expect(spamhausQueryName("2001:db8::1")).toEndWith(".8.b.d.0.1.0.0.2.zen.spamhaus.org");
  });
});

describe("isListedOnSpamhaus", () => {
  test("listed when Spamhaus answers with a 127.x return code", async () => {
    mockFetch(() => dohAnswer(["127.0.1.2"]));
    expect(await isListedOnSpamhaus("bad.example")).toBe(true);
  });

  test("not listed when there is no answer", async () => {
    mockFetch(() => dohAnswer([]));
    expect(await isListedOnSpamhaus("example.com")).toBe(false);
  });

  test("a rate-limited answer is not a listing", async () => {
    mockFetch(() => dohAnswer(["127.255.255.254"]));
    expect(await isListedOnSpamhaus("example.com")).toBe(false);
  });

  test("lookup failures count as not listed", async () => {
    mockFetch(() => {
      throw new Error("offline");
    });
    expect(await isListedOnSpamhaus("example.com")).toBe(false);
  });

  test("uses the given resolver, defaulting to Cloudflare", async () => {
    const fake = mockFetch(() => dohAnswer([]));
    await isListedOnSpamhaus("example.com", "https://doh.test/q");
    await isListedOnSpamhaus("example.com");
    expect(requestedUrls(fake)).toEqual([
      "https://doh.test/q?name=example.com.dbl.spamhaus.org&type=A",
      "https://cloudflare-dns.com/dns-query?name=example.com.dbl.spamhaus.org&type=A",
    ]);
  });
});
