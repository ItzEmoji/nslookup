import { describe, expect, test } from "bun:test";
import {
  buildConsensus,
  collectAnswerData,
  type DnsAnswer,
  isPropagated,
  queryResolver,
  type ResolverResult,
} from "../src/lib/dns.ts";
import { dohAnswer, mockFetch, requestedUrls } from "./support/mock-fetch.ts";

const answers = (...values: string[]): DnsAnswer[] => values.map((data) => ({ data }));
const result = (resolver: string, ...values: string[]): ResolverResult => ({
  resolver,
  answers: answers(...values),
  error: null,
});

describe("queryResolver", () => {
  test("queries the DoH JSON endpoint and returns the answers", async () => {
    const fake = mockFetch(() => dohAnswer(["93.184.215.14"]));

    const res = await queryResolver("example.com", "A", "Cloudflare", "https://doh.test/q");

    expect(requestedUrls(fake)).toEqual(["https://doh.test/q?name=example.com&type=A"]);
    expect(res).toMatchObject({ resolver: "Cloudflare", error: null });
    expect(res.answers.map((a) => a.data)).toEqual(["93.184.215.14"]);
  });

  test.each([
    [3, "NXDOMAIN (Domain does not exist)"],
    [2, "SERVFAIL (Server failed to complete the request)"],
    [9, "DNS Error (Status: 9)"],
  ])("maps rcode %d to a readable error", async (status, error) => {
    mockFetch(() => Response.json({ Status: status }));
    expect(await queryResolver("x.test", "A", "R", "https://doh.test/q")).toEqual({
      resolver: "R",
      answers: [],
      error,
    });
  });

  test("reports HTTP errors without throwing", async () => {
    mockFetch(() => new Response("bad gateway", { status: 502 }));
    expect((await queryResolver("x.test", "A", "R", "https://doh.test/q")).error).toBe("HTTP 502");
  });

  test("reports network errors without throwing", async () => {
    mockFetch(() => {
      throw new Error("connection reset");
    });
    expect((await queryResolver("x.test", "A", "R", "https://doh.test/q")).error).toBe(
      "connection reset",
    );
  });
});

describe("collectAnswerData", () => {
  test("merges answers from all resolvers without duplicates, in resolver order", async () => {
    mockFetch((url) =>
      dohAnswer(url.hostname === "one.test" ? ["10.0.0.1", "10.0.0.2"] : ["10.0.0.2", "10.0.0.3"]),
    );
    const data = await collectAnswerData("example.com", "A", {
      One: "https://one.test/q",
      Two: "https://two.test/q",
    });
    expect(data).toEqual(["10.0.0.1", "10.0.0.2", "10.0.0.3"]);
  });
});

describe("buildConsensus", () => {
  test("picks the value most resolvers agree on", () => {
    expect(buildConsensus([result("A", "1.1.1.1", "2.2.2.2"), result("B", "2.2.2.2")])).toEqual({
      value: "2.2.2.2",
      confirmedBy: ["A", "B"],
    });
  });

  test("breaks ties by first appearance", () => {
    expect(buildConsensus([result("A", "1.1.1.1"), result("B", "2.2.2.2")])?.value).toBe("1.1.1.1");
  });

  test("is null when nobody answered", () => {
    expect(buildConsensus([result("A"), result("B")])).toBeNull();
  });
});

describe("isPropagated", () => {
  const typeResult = (byResolver: Record<string, string[]>) => ({
    resolvers: Object.fromEntries(
      Object.entries(byResolver).map(([name, values]) => [name, answers(...values)]),
    ),
  });

  test("true when every resolver returns the same set, in any order", () => {
    const results = { MX: typeResult({ A: ["10 a.", "20 b."], B: ["20 b.", "10 a."] }) };
    expect(isPropagated(results, ["MX"])).toBe(true);
  });

  test("false when a non-address record differs", () => {
    const results = { TXT: typeResult({ A: ["v=spf1 -all"], B: [] }) };
    expect(isPropagated(results, ["TXT"])).toBe(false);
  });

  test("tolerates differing A/AAAA records when every resolver has some (CDNs, geo-DNS)", () => {
    const results = { A: typeResult({ A: ["1.1.1.1"], B: ["2.2.2.2"] }) };
    expect(isPropagated(results, ["A"])).toBe(true);
  });

  test("false when a resolver has no address record yet", () => {
    const results = { A: typeResult({ A: ["1.1.1.1"], B: [] }) };
    expect(isPropagated(results, ["A"])).toBe(false);
  });

  test("a single resolver can't disagree with itself", () => {
    const results = { TXT: typeResult({ A: ["x"] }) };
    expect(isPropagated(results, ["TXT"])).toBe(true);
  });
});
