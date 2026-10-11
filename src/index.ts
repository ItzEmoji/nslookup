import { handleRequest } from "./router.ts";

export default {
  fetch: handleRequest,
} satisfies ExportedHandler;
