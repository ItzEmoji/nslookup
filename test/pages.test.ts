import { describe, expect, test } from "bun:test";
import { apiDocsPage, appPage, helpPage, helpText } from "../src/pages/index.ts";

describe("pages", () => {
  test("the web app has its stylesheet and script inlined", () => {
    expect(appPage).not.toContain("<!-- inline:");
    expect(appPage).toContain("<style>");
    expect(appPage).toContain("function openSettings");
  });

  test.each([
    ["help page", helpPage],
    ["help text", helpText],
    ["API docs", apiDocsPage],
  ])("%s substitutes the origin everywhere", (_name, render) => {
    const page = render("https://lookup.test");
    expect(page).not.toContain("{{ORIGIN}}");
    expect(page).toContain("https://lookup.test");
  });

  test("origins with $ sequences are inserted literally", () => {
    expect(helpText("https://a$&b.test")).toContain("https://a$&b.test");
  });
});
