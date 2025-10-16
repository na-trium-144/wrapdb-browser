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
import { calculateScore } from "~/utils/search";
import { Header } from "~/components/header";

// --- Types ---
type PackageResult = {
  name: string;
  packageData: WrapDbPackageData;
  wrapFileData?: WrapFileData;
  metadata?: PackageMetadata;
};

// --- Data Loader ---
export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 10;
  const offset = (page - 1) * limit;

  if (!query) {
    return { results: [], total: 0, page, limit, query: "" };
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

    const total = searchResults.length;
    const paginatedResults = searchResults.slice(offset, offset + limit);

    return {
      results: (await Promise.all(
        paginatedResults.map(async ({ name, pkg }) => {
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
      total,
      page,
      limit,
      query,
    };
  } catch (error) {
    console.error("Failed to search packages:", error);
    return { results: [], total: 0, page, limit, query };
  }
}

// --- Pagination Logic ---
function getPaginationItems(currentPage: number, totalPages: number) {
  const delta = 2;
  const left = currentPage - delta;
  const right = currentPage + delta + 1;
  const range = [];
  const rangeWithDots: (number | string)[] = [];

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i < right)) {
      range.push(i);
    }
  }

  let l: number | undefined;
  for (const i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l !== 1) {
        rangeWithDots.push("...");
      }
    }
    rangeWithDots.push(i);
    l = i;
  }

  return rangeWithDots;
}

// --- Meta ---
export function meta({ data }: Route.MetaArgs) {
  const query = data?.query || "";
  
  return [
    { title: query ? `Search: ${query} - WrapDB Browser` : "Search - WrapDB Browser" },
    {
      name: "description",
      content: query 
        ? `Search results for "${query}" in WrapDB packages for Meson build system.`
        : "Search WrapDB packages for Meson build system.",
    },
  ];
}

// --- Component ---
export default function Search() {
  const { results, total, page, limit } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");
  const totalPages = Math.ceil(total / limit);
  const paginationItems = getPaginationItems(page, totalPages);

  return (
    <>
      <Header />
      <div className="mt-24 w-full max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-content-0 dark:text-content-0d">
          Search Results for:
          <span className="ml-2 text-link dark:text-linkd">{query}</span>
        </h1>

        <main>
          {results.length > 0 ? (
            <>
              <div className="space-y-4">
                <p className="text-content-2 dark:text-content-2d mb-4">
                  Found {total} packages.
                  {totalPages > 1 && ` Showing page ${page} of ${totalPages}.`}
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
                              clsx(
                                "bg-base-2 text-content-1 dark:bg-base-2d dark:text-content-1d",
                                "border border-base-3 dark:border-base-3d",
                              ),
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
              {totalPages > 1 && (
                <nav className="flex w-full text-xl items-center space-x-2 mt-8">
                  <div className="flex-1 min-w-max text-right">
                    {page > 1 && (
                      <Link
                        to={`/search?q=${encodeURIComponent(query || "")}&page=${page - 1}`}
                        className={clsx(
                          "mr-2 p-2",
                          "text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline",
                        )}
                      >
                        &larr; Previous
                      </Link>
                    )}
                  </div>
                  {paginationItems.map((item, index) =>
                    item === page ? (
                      <span
                        key={index}
                        className="p-2 font-semibold italic text-content-2 dark:text-content-2d"
                      >
                        {item}
                      </span>
                    ) : typeof item === "number" ? (
                      <Link
                        key={index}
                        to={`/search?q=${encodeURIComponent(query || "")}&page=${item}`}
                        className={clsx(
                          "p-2 hidden md:inline",
                          "text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline",
                        )}
                      >
                        {item}
                      </Link>
                    ) : (
                      <span
                        key={index}
                        className="p-2 text-content-2 dark:text-content-2d hidden md:inline"
                      >
                        {item}
                      </span>
                    ),
                  )}
                  <span className="p-0 text-content-2 dark:text-content-2d md:hidden">
                    of
                  </span>
                  <span className="p-2 text-content-2 dark:text-content-2d md:hidden">
                    {totalPages}
                  </span>
                  <div className="flex-1 min-w-max">
                    {page < totalPages && (
                      <Link
                        to={`/search?q=${encodeURIComponent(query || "")}&page=${page + 1}`}
                        className={clsx(
                          "ml-2 p-2",
                          "text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline",
                        )}
                      >
                        Next &rarr;
                      </Link>
                    )}
                  </div>
                </nav>
              )}
            </>
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
