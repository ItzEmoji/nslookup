import { describe, expect, test } from "bun:test";
import { parseCertificateList } from "../src/routes/ssl.ts";

describe("parseCertificateList", () => {
  test("parses a regular JSON array", () => {
    expect(parseCertificateList('[{"id":1}]', "certspotter")).toEqual([{ id: 1 }]);
  });

  test("stitches back-to-back arrays from crt.sh", () => {
    expect(parseCertificateList('[{"id":1}]\n[{"id":2}]', "crt.sh")).toEqual([
      { id: 1 },
      { id: 2 },
    ]);
  });

  test("wraps back-to-back objects into an array", () => {
    expect(parseCertificateList('{"id":1}{"id":2}', "certspotter")).toEqual([{ id: 1 }, { id: 2 }]);
  });

  test("throws on input that isn't JSON at all", () => {
    expect(() => parseCertificateList("<html>", "certspotter")).toThrow();
  });
});
