import { useLoaderData, useSearchParams, Link } from "react-router";
import type { Route } from "./+types/search";
import {
  fetchReleases,
  fetchWrap,
  type WrapDbPackageData,
  type WrapFileData,
} from "~/utils/wrapdb";
import { fetchMetadata, type PackageMetadata } from "~/utils/metadata";
import clsx from "clsx";
import { GithubIcon } from "~/components/icon";

// --- Types ---
type PackageResult = {
  name: string;
  packageData: WrapDbPackageData;
  wrapFileData?: WrapFileData;
  metadata?: PackageMetadata;
};

// --- Scoring Logic ---
function calculateScore(
  name: string,
  data: WrapDbPackageData,
  query: string,
): number {
  const n = name.toLowerCase();
  const q = query.toLowerCase();

  if (n === q) return 100; // Exact name match
  if (n.startsWith(q)) return 90; // Name starts with

  const exactDepMatch = (data.dependency_names || []).some(
    (dep) => dep.toLowerCase() === q,
  );
  const exactProgMatch = (data.program_names || []).some(
    (prog) => prog.toLowerCase() === q,
  );
  if (exactDepMatch || exactProgMatch) return 80; // Exact match in deps/progs

  if (n.includes(q)) return 70; // Name contains

  const depMatch = (data.dependency_names || []).some((dep) =>
    dep.toLowerCase().includes(q),
  );
  const progMatch = (data.program_names || []).some((prog) =>
    prog.toLowerCase().includes(q),
  );
  if (depMatch || progMatch) return 50; // Contains match in deps/progs

  return 0;
}

// --- Data Loader ---
export async function loader({ request, context }: Route.LoaderArgs) {
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
        name,
        pkg: data,
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return {
      results: (await Promise.all(
        searchResults.map(async ({ name, pkg }) => {
          try {
            if (pkg.versions.length === 0)
              throw new Error("No versions available");
            const latestVersion = pkg.versions[0];
            const wrapData = await fetchWrap(name, latestVersion);
            const metadata = await fetchMetadata(
              wrapData.sourceUrl,
              latestVersion,
              context.cloudflare.env,
            );
            return {
              name,
              packageData: pkg,
              wrapFileData: wrapData,
              metadata,
            };
          } catch (error) {
            console.error(`Failed to fetch metadata for ${name}:`, error);
            return {
              name,
              packageData: pkg,
            };
          }
        }),
      )) satisfies PackageResult[],
    };
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

  return (
    <>
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-content-0 dark:text-content-0d">
            Search Results for:
            <span className="ml-2 text-link dark:text-linkd">{query}</span>
          </h1>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg bg-link text-base-0 hover:bg-linkh transition-colors"
          >
            &larr; Back to Home
          </Link>
        </header>

        <main>
          {results.length > 0 ? (
            <div className="space-y-4">
              <p className="text-content-2 dark:text-content-2d mb-4">
                Found {results.length} packages.
              </p>
              {results.map((pkg) => (
                <Link
                  to={`/package/${pkg.name}/${pkg.packageData.versions[0]}`}
                  key={pkg.name}
                  className="block"
                >
                  <div
                    className={clsx(
                      "bg-base-1 dark:bg-base-1d p-6 rounded-lg",
                      "border border-base-2 dark:border-base-2d hover:border-blue-500",
                      "transition-transform duration-200 ease-in-out transform hover:-translate-y-1",
                    )}
                  >
                    <h2>
                      <span className="text-2xl font-semibold text-link dark:text-linkd">
                        {pkg.name}
                      </span>
                      <span
                        className={clsx(
                          "inline-block ml-2 px-2 py-1 text-xs rounded-full",
                          pkg.metadata?.isOutdated === true &&
                            "bg-warn text-base-0",
                          pkg.metadata?.isOutdated === false &&
                            "bg-success text-content-1",
                          pkg.metadata?.isOutdated === undefined &&
                            "bg-base-2 text-content-1 dark:bg-base-2d dark:text-content-1d",
                        )}
                      >
                        {pkg.packageData.versions[0]}
                      </span>
                      {pkg.metadata?.repo && (
                        <span className="inline-block ml-2 text-base/8 text-content-2 dark:text-content-2d">
                          &mdash;
                          <GithubIcon className="inline-block w-4 h-4 ml-2 mr-1" />
                          <span>
                            {pkg.metadata.repo.owner}/{pkg.metadata.repo.name}
                          </span>
                        </span>
                      )}
                    </h2>
                    {pkg.metadata?.description && (
                      <p className="text-base text-content-1 dark:text-content-1d mt-2 line-clamp-2">
                        {pkg.metadata.description}
                      </p>
                    )}
                    {pkg.wrapFileData &&
                      pkg.wrapFileData.dependencyNames.length >= 1 && (
                        <p className="text-sm text-content-2 dark:text-content-2d mt-1 line-clamp-2">
                          Libraries:{" "}
                          {pkg.wrapFileData.dependencyNames.join(", ")}
                        </p>
                      )}
                    {pkg.wrapFileData &&
                      pkg.wrapFileData.programNames.length >= 1 && (
                        <p className="text-sm text-content-2 dark:text-content-2d mt-1 line-clamp-2">
                          Programs: {pkg.wrapFileData.programNames.join(", ")}
                        </p>
                      )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              className={clsx(
                "bg-base-1 dark:bg-base-1d p-8 rounded-lg",
                "border border-base-2 dark:border-base-2d text-center",
              )}
            >
              <h2 className="text-2xl font-semibold mb-2">No results found.</h2>
              <p className="text-content-2 dark:text-content-2d">
                Please check the spelling or try a different search term.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
