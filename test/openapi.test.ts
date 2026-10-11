import { describe, expect, test } from "bun:test";
import pkg from "../package.json" with { type: "json" };
import { openApiDocument } from "../src/openapi.ts";
import { API_ROUTE_NAMES, handleRequest } from "../src/router.ts";
import { dohAnswer, mockFetch } from "./support/mock-fetch.ts";

const ORIGIN = "https://lookup.test";
const spec = openApiDocument(ORIGIN);

interface Schema {
  $ref?: string;
  type?: string;
  required?: string[];
}
interface Operation {
  operationId: string;
  responses: Record<string, { content?: Record<string, { schema: Schema }> }>;
}

/** A generated client: no browser headers, asks for JSON like most generators do. */
const CLIENT = { "user-agent": "openapi-generator/7.0", accept: "application/json, text/plain" };

/** Every upstream answers something plausible, so every operation can succeed. */
function mockUpstreams() {
  return mockFetch((url) => {
    if (url.hostname === "rdap.org") return Response.json({ ldhName: "EXAMPLE.COM" });
    if (url.hostname === "api.certspotter.com") return Response.json([{ dns_names: ["a.test"] }]);
    const name = url.searchParams.get("name") ?? "";
    if (name.includes("spamhaus")) return dohAnswer([]);
    return dohAnswer(["93.184.215.14"]);
  });
}

function resolveSchema(schema: Schema): Schema {
  if (!schema.$ref) return schema;
  const name = schema.$ref.split("/").at(-1) ?? "";
  return (spec.components.schemas as Record<string, Schema>)[name] ?? {};
}

const operations = Object.entries(spec.paths).map(([path, item]) => ({
  path,
  operation: (item as { get: Operation }).get,
}));

describe("GET /openapi.json", () => {
  test("is served as JSON to browsers and API clients alike", async () => {
    for (const headers of [CLIENT, { accept: "text/html", "sec-fetch-mode": "navigate" }]) {
      const res = await handleRequest(new Request(`${ORIGIN}/openapi.json`, { headers }));
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toBe("application/json");
      expect(res.headers.get("access-control-allow-origin")).toBe("*");
      expect(await res.json()).toMatchObject({ openapi: "3.1.0" });
    }
  });

  test("is compact like every other endpoint, and pretty-printed with ?preview", async () => {
    const body = async (query: string) =>
      (
        await handleRequest(new Request(`${ORIGIN}/openapi.json${query}`, { headers: CLIENT }))
      ).text();
    expect(await body("")).toBe(`${JSON.stringify(spec)}\n`);
    expect(await body("?preview")).toBe(`${JSON.stringify(spec, null, 2)}\n`);
  });

  test("points at the deployment it was fetched from and carries the package version", () => {
    expect(spec.servers).toEqual([{ url: ORIGIN }]);
    expect(spec.info.version).toBe(pkg.version);
  });

  test("documents every API route the router serves", () => {
    const documented = new Set(operations.map(({ path }) => path.split("/")[1]));
    for (const route of API_ROUTE_NAMES) expect(documented).toContain(route);
  });

  test("operation ids are unique", () => {
    const ids = operations.map(({ operation }) => operation.operationId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("every documented operation", () => {
  test.each(operations)("$path answers as documented", async ({ path, operation }) => {
    mockUpstreams();
    const url = `${ORIGIN}${path.replace("{domain}", "example.com").replace("{target}", "example.com")}`;
    const res = await handleRequest(new Request(url, { headers: CLIENT }));

    expect(res.status).toBe(200);
    const content = operation.responses["200"]?.content ?? {};
    const contentType = res.headers.get("content-type")?.split(";")[0] ?? "";
    expect(Object.keys(content)).toContain(contentType);

    const schema = resolveSchema(content[contentType]?.schema ?? {});
    if (contentType === "application/json" && schema.required) {
      const body = (await res.json()) as Record<string, unknown>;
      for (const key of schema.required) expect(body).toHaveProperty(key);
    }
  });
});
