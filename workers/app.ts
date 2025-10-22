import { createRequestHandler } from "react-router";
import type { SheetStore } from "./app";
export { SheetStore } from "../app/durable-objects/sheet-store";

declare global {
  interface CloudflareEnvironment extends Env {
    SHEET_STORE: DurableObjectNamespace<SheetStore>;
  }
}

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: CloudflareEnvironment;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  // @ts-ignore - virtual module provided by React Router
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<CloudflareEnvironment>;
