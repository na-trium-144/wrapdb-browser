import { fetchPatch } from "~/utils/wrapdb";
import type { Route } from "./+types/get_patch";

export async function loader({ params }: Route.LoaderArgs): Promise<Response> {
  return fetchPatch(params.name || "", params.version || "");
}
