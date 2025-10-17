import { createRequestHandler } from "react-router";
import { syncDatabase } from "~/utils/d1";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
  async scheduled(controller, env, ctx) {
    console.log("Cron job started: Syncing database...");
    const result = await syncDatabase(env.DB, env.wrapdb_kv);
    if (result.success) {
      console.log(`Cron job finished: ${result.message}`);
    } else {
      console.error("Cron job failed: Database sync failed.", result.error);
    }
  },
} satisfies ExportedHandler<Env>;
