import { afterEach, mock } from "bun:test";

type Responder = (url: URL) => Response | Promise<Response>;

const realFetch = globalThis.fetch;

/** DoH JSON answer body for the given values. */
export function dohAnswer(values: string[], status = 0): Response {
  return Response.json({
    Status: status,
    Answer: values.map((data) => ({ name: "example.com", type: 1, TTL: 300, data })),
  });
}

/**
 * Replaces global `fetch` for the current test. Returns the mock so tests can
 * assert on the URLs that were requested; restored automatically afterwards.
 */
export function mockFetch(responder: Responder) {
  const fake = mock((input: string | URL | Request) => {
    const href = input instanceof Request ? input.url : String(input);
    return Promise.resolve(responder(new URL(href)));
  });
  globalThis.fetch = fake as unknown as typeof fetch;
  return fake;
}

/** URLs passed to a mocked `fetch`, in call order. */
export function requestedUrls(fake: ReturnType<typeof mockFetch>): string[] {
  return fake.mock.calls.map(([input]) => String(input));
}

afterEach(() => {
  globalThis.fetch = realFetch;
});
