import { searchPackagesFromDB } from "~/utils/d1";
import type { Route } from "./+types/search_suggestions";
import { calculateScore } from "~/utils/search";

export type Suggestion = {
  name: string;
  latest_version: string;
};

export async function loader({
  request,
  context,
}: Route.LoaderArgs): Promise<{ suggestions: Suggestion[] }> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  if (!query) {
    return { suggestions: [] };
  }

  const db = context.cloudflare.env.DB;
  const results = await searchPackagesFromDB(db, query);
  const sortedResults = results
    .map((pkg) => ({ pkg, score: calculateScore(pkg, query) }))
    .sort((a, b) => b.score - a.score)
    .map(({ pkg }) => pkg)
    .slice(0, 5) // Get top 5 suggestions
    .map((item) => ({ name: item.name, latest_version: item.latest_version }));

  return { suggestions: sortedResults };
}
