import type { Route } from "./+types/search_suggestions";
import { fetchReleases } from "~/utils/wrapdb";
import { calculateScore } from "~/utils/search";

export type Suggestion = {
  name: string;
  latest_version: string;
};

export async function loader({ request }: Route.LoaderArgs): Promise<{ suggestions: Suggestion[] }> {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  if (!query) {
    return { suggestions: [] };
  }

  const packages = await fetchReleases();

  const searchResults = Object.entries(packages)
    .map(([name, data]) => ({
      score: calculateScore(name, data, query),
      name,
      latest_version: data.versions[0],
    }))
    .filter((item) => item.score > 0 && item.latest_version)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10) // Get top 10 suggestions
    .map((item) => ({ name: item.name, latest_version: item.latest_version }));

  return { suggestions: searchResults };
}
