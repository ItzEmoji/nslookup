import apiDocsAsset from "./api-docs.html" with { type: "text" };
import appScriptAsset from "./app/app.js" with { type: "text" };
import appShellAsset from "./app/index.html" with { type: "text" };
import appStylesAsset from "./app/styles.css" with { type: "text" };
import helpAsset from "./help.html" with { type: "text" };
import helpTextAsset from "./help.txt" with { type: "text" };

// `with { type: "text" }` makes every import a string at runtime, but Bun's
// type definitions declare `*.html` imports as HTML bundles regardless of
// the attribute, so the type is pinned down here once.
const asText = (asset: unknown) => asset as string;

// Replacement callbacks rather than strings: a replacement string would
// interpret `$&`, `$1`, ... sequences that appear in the inlined script.
const inlined = (template: string, marker: string, content: string) =>
  template.replace(`<!-- inline:${marker} -->`, () => content);

const withOrigin = (template: unknown, origin: string) =>
  asText(template).replaceAll("{{ORIGIN}}", () => origin);

/** The single-page web app, with its stylesheet and script inlined. */
export const appPage = inlined(
  inlined(asText(appShellAsset), "styles.css", `<style>${asText(appStylesAsset)}</style>`),
  "app.js",
  `<script>${asText(appScriptAsset)}</script>`,
);

export const helpPage = (origin: string) => withOrigin(helpAsset, origin);
export const helpText = (origin: string) => withOrigin(helpTextAsset, origin);
export const apiDocsPage = (origin: string) => withOrigin(apiDocsAsset, origin);
