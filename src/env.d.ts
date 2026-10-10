// Page assets are imported as plain strings (`with { type: "text" }`)
// and inlined into the bundle by Bun.

declare module "*.html" {
  const content: string;
  export default content;
}

declare module "*.css" {
  const content: string;
  export default content;
}

declare module "*.txt" {
  const content: string;
  export default content;
}

declare module "*/app.js" {
  const content: string;
  export default content;
}
