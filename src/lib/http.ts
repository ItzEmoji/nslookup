/** Every API response is readable cross-origin so the API can be called from any site. */
export const CORS_HEADERS = { "Access-Control-Allow-Origin": "*" } as const;

export interface ReplyOptions {
  status?: number;
  /** Omitted: the runtime infers `text/plain;charset=UTF-8` for string bodies. */
  contentType?: string;
  cors?: boolean;
}

export function reply(body: string | null, options: ReplyOptions = {}): Response {
  const { status = 200, contentType, cors = true } = options;
  const headers: Record<string, string> = cors ? { ...CORS_HEADERS } : {};
  if (contentType) headers["content-type"] = contentType;
  return new Response(body, { status, headers });
}

export interface JsonOptions {
  status?: number;
  /** Indentation passed to `JSON.stringify`; set by the `?preview` query parameter. */
  space?: number | undefined;
}

/** JSON body terminated by a newline, so `curl` output doesn't run into the prompt. */
export function json(data: unknown, options: JsonOptions = {}): Response {
  const body = `${JSON.stringify(data, null, options.space)}\n`;
  return reply(body, {
    contentType: "application/json",
    ...(options.status === undefined ? {} : { status: options.status }),
  });
}

export function text(body: string, status = 200): Response {
  return reply(body, { status, contentType: "text/plain" });
}

export function html(body: string, options: { cors?: boolean } = {}): Response {
  return reply(body, { contentType: "text/html;charset=UTF-8", cors: options.cors ?? true });
}
