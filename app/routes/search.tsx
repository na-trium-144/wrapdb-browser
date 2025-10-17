import { useLoaderData, useSearchParams, Link } from "react-router";
import type { Route } from "./+types/search";
import {
  searchPackagesFromDB,
  type PackageFromDB,
  getOrUpdatePackageInDB,
} from "~/utils/d1";
import clsx from "clsx";
import { GithubIcon } from "~/components/icon";
import { Header } from "~/components/header";
import { calculateScore } from "~/utils/search";
import { DisplayUpstreamRepo } from "~/components/upstreamRepo";
import type { RepoType } from "~/utils/metadata";

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
    const db = context.cloudflare.env.DB;
    const results = await searchPackagesFromDB(db, query);
    const sortedResults = await Promise.all(
      results
        .map((pkg) => ({ pkg, score: calculateScore(pkg, query) }))
        .sort((a, b) => b.score - a.score)
        .map(({ pkg }) => pkg)
        .slice(offset, offset + limit)
        .map(
          async (pkg) =>
            (await getOrUpdatePackageInDB(
              db,
              pkg.name,
              context.cloudflare.env,
              pkg,
            )) ?? pkg,
        ),
    );

    return {
      results: sortedResults,
      total: sortedResults.length,
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
    {
      title: query
        ? `Search: ${query} - WrapDB Browser`
        : "Search - WrapDB Browser",
    },
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
                {results.map((pkg: PackageFromDB) => (
                  <Link
                    to={`/package/${pkg.name}/${pkg.latest_version}`}
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
                            pkg.is_outdated === 1 && "bg-warn text-base-0",
                            pkg.is_outdated === 0 &&
                              "bg-success text-content-1",
                            pkg.is_outdated === null &&
                              clsx(
                                "bg-base-2 text-content-1 dark:bg-base-2d dark:text-content-1d",
                                "border border-base-3 dark:border-base-3d",
                              ),
                          )}
                        >
                          {pkg.latest_version}
                        </span>
                        {pkg.repo_type && (
                          <span className="inline-block ml-2 text-base/8 text-content-2 dark:text-content-2d">
                            &mdash;
                            <DisplayUpstreamRepo
                              className="ml-2"
                              repoType={pkg.repo_type as RepoType}
                              owner={pkg.repo_owner!}
                              name={pkg.repo_name!}
                            />
                          </span>
                        )}
                      </h2>
                      {pkg.description && (
                        <p className="text-base text-content-1 dark:text-content-1d mt-2 line-clamp-2">
                          {pkg.description}
                        </p>
                      )}
                      {(JSON.parse(pkg.dependency_names) as string[]).length >=
                        1 && (
                        <p className="text-sm text-content-2 dark:text-content-2d mt-1 line-clamp-2">
                          Libraries:{" "}
                          {(JSON.parse(pkg.dependency_names) as string[]).join(
                            ", ",
                          )}
                        </p>
                      )}
                      {(JSON.parse(pkg.program_names) as string[]).length >=
                        1 && (
                        <p className="text-sm text-content-2 dark:text-content-2d mt-1 line-clamp-2">
                          Programs:{" "}
                          {(JSON.parse(pkg.program_names) as string[]).join(
                            ", ",
                          )}
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
                        to={`/search?q=${encodeURIComponent(
                          query || "",
                        )}&page=${page - 1}`}
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
                        to={`/search?q=${encodeURIComponent(
                          query || "",
                        )}&page=${item}`}
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
                        to={`/search?q=${encodeURIComponent(
                          query || "",
                        )}&page=${page + 1}`}
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
