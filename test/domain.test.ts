import { describe, expect, test } from "bun:test";
import {
  getBaseDomain,
  ipv4ToArpa,
  ipv6ToArpa,
  isIPv4,
  isIPv6,
  isValidDomain,
} from "../src/lib/domain.ts";

describe("isIPv4", () => {
  test.each(["1.1.1.1", "0.0.0.0", "255.255.255.255", "192.168.0.10"])("accepts %s", (ip) => {
    expect(isIPv4(ip)).toBe(true);
  });

  test.each(["256.1.1.1", "1.1.1", "01.1.1.1", "1.1.1.1.1", "example.com"])("rejects %s", (ip) => {
    expect(isIPv4(ip)).toBe(false);
  });
});

describe("isIPv6", () => {
  test.each(["::1", "2606:4700::1111", "2001:db8:0:0:0:0:0:1"])("accepts %s", (ip) => {
    expect(isIPv6(ip)).toBe(true);
  });

  test.each(["1.1.1.1", "example.com", "2001:db8::g"])("rejects %s", (ip) => {
    expect(isIPv6(ip)).toBe(false);
  });
});

describe("isValidDomain", () => {
  test.each([
    "example.com",
    "a.b.example.co.uk",
    "xn--bcher-kva.example",
    "bücher.de",
    "localhost",
  ])("accepts %s", (domain) => expect(isValidDomain(domain)).toBe(true));

  test.each(["example", "not_a_domain", "example.c", "exa mple.com"])("rejects %s", (domain) => {
    expect(isValidDomain(domain)).toBe(false);
  });
});

describe("getBaseDomain", () => {
  test.each([
    ["example.com", "example.com"],
    ["www.example.com", "example.com"],
    ["a.b.c.example.com", "example.com"],
    ["www.example.co.uk", "example.co.uk"],
    ["example.co.uk", "example.co.uk"],
    ["com", "com"],
  ])("%s -> %s", (input, expected) => {
    expect(getBaseDomain(input)).toBe(expected);
  });
});

describe("reverse names", () => {
  test("IPv4 to in-addr.arpa", () => {
    expect(ipv4ToArpa("192.0.2.1")).toBe("1.2.0.192.in-addr.arpa");
  });

  test("IPv6 expands :: before reversing nibbles", () => {
    expect(ipv6ToArpa("2001:db8::1")).toBe(
      "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
    );
  });

  test("IPv6 without :: is padded per group", () => {
    expect(ipv6ToArpa("2001:db8:0:0:0:0:0:1")).toBe(ipv6ToArpa("2001:db8::1"));
  });
});
