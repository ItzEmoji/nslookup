import { describe, expect, test } from "bun:test";
import { apiDocsPage, appPage } from "../src/pages/index.ts";

describe("pages", () => {
  test("the web app has its stylesheet and script inlined", () => {
    expect(appPage).not.toContain("<!-- inline:");
    expect(appPage).toContain("<style>");
    expect(appPage).toContain("function openSettings");
  });

  test("the API page substitutes the origin everywhere", () => {
    const page = apiDocsPage("https://lookup.test");
    expect(page).not.toContain("{{ORIGIN}}");
    expect(page).toContain("https://lookup.test");
  });

  test("origins with $ sequences are inserted literally", () => {
    expect(apiDocsPage("https://a$&b.test")).toContain("https://a$&b.test");
  });

  test("the app has no documentation links", () => {
    expect(appPage).not.toContain('href="/help"');
    expect(appPage).not.toContain('href="/api-docs"');
    expect(appPage).not.toContain('href="/openapi.json"');
    expect(appPage).not.toContain('<nav class="topbar-links"');
  });
});
