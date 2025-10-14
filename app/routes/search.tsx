import { useLoaderData, useSearchParams, Link } from "react-router";
import type { Route } from "./+types/search";
import { fetchReleases, type WrapDbPackageData } from "~/utils/wrapdb";

// --- Types ---
type PackageResult = {
  name: string;
  latest_version: string;
  dependency_names: string[];
  program_names: string[];
};

// --- Scoring Logic ---
function calculateScore(name: string, data: WrapDbPackageData, query: string): number {
  const n = name.toLowerCase();
  const q = query.toLowerCase();

  if (n === q) return 100; // Exact name match
  if (n.startsWith(q)) return 90; // Name starts with

  const exactDepMatch = (data.dependency_names || []).some(dep => dep.toLowerCase() === q);
  const exactProgMatch = (data.program_names || []).some(prog => prog.toLowerCase() === q);
  if (exactDepMatch || exactProgMatch) return 80; // Exact match in deps/progs

  if (n.includes(q)) return 70; // Name contains

  const depMatch = (data.dependency_names || []).some(dep => dep.toLowerCase().includes(q));
  const progMatch = (data.program_names || []).some(prog => prog.toLowerCase().includes(q));
  if (depMatch || progMatch) return 50; // Contains match in deps/progs

  return 0;
}

// --- Data Loader ---
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();

  if (!query) {
    return { results: [] };
  }

  try {
    const packages = await fetchReleases();

    const searchResults = Object.entries(packages)
      .map(([name, data]) => ({
        score: calculateScore(name, data, query),
        pkg: {
          name,
          latest_version: data.versions[0] || 'N/A',
          dependency_names: data.dependency_names || [],
          program_names: data.program_names || [],
        }
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.pkg);

    return { results: searchResults };

  } catch (error) {
    console.error("Failed to search packages:", error);
    return { results: [] };
  }
}

// --- Component ---
export default function Search() {
  const { results } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");

  const renderNameList = (title: string, names: string[]) => {
    if (names.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-sm font-semibold">{title}:</span>
        {names.map(name => (
            <span key={name} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded-full">
                {name}
            </span>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen pt-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            Search Results for: <span className="text-blue-600 dark:text-blue-400">{query}</span>
          </h1>
          <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            &larr; Back to Home
          </Link>
        </header>

        <main>
          {results.length > 0 ? (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">Found {results.length} packages.</p>
              {results.map((pkg) => (
                <Link to={`/package/${pkg.name}/${pkg.latest_version}`} key={pkg.name} className="block">
                  <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-500 transition-all duration-200 ease-in-out transform hover:-translate-y-1">
                    <h2 className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{pkg.name}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Latest Version: {pkg.latest_version}</p>
                    {renderNameList("Dependencies", pkg.dependency_names)}
                    {renderNameList("Programs", pkg.program_names)}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-900 p-8 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
              <h2 className="text-2xl font-semibold mb-2">No results found.</h2>
              <p className="text-gray-600 dark:text-gray-400">Please check the spelling or try a different search term.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
