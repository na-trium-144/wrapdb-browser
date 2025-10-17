import type { Route } from "./+types/init_db";
import { syncDatabase } from "~/utils/d1";

export async function loader({ context }: Route.LoaderArgs) {
  // to enable this route only in development, you need to add ENABLE_INITDB=1 to your .env file.
  if (!context.cloudflare.env.ENABLE_INITDB) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "disabled",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const result = await syncDatabase(
    context.cloudflare.env.DB,
    context.cloudflare.env.wrapdb_kv,
  );

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
    status: result.success ? 200 : 500,
  });
}
