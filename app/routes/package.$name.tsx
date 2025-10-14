import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/package.$name";
import {
  fetchReleases,
  fetchWrap,
  type WrapDbPackageData,
  type WrapFileData,
} from "~/utils/wrapdb";
import { CodeBlockWithCopyButton } from "~/components/copy-button";
import { fetchMetadata, type PackageMetadata } from "~/utils/metadata";

// --- Types ---
type PackageDetail =
  | {
      name: string;
      error: null;
      packageData: WrapDbPackageData;
      wrapFileData: WrapFileData;
      metadata: PackageMetadata;
    }
  | {
      name: string;
      error: "notFound" | "error";
    };

// --- Data Loader ---
export async function loader({
  params,
  context,
}: Route.LoaderArgs): Promise<PackageDetail> {
  const name = params.name || "";

  try {
    const packages = await fetchReleases();
    const packageData = packages[name];

    if (!packageData) {
      return {
        name: name,
        error: "notFound",
      };
    }
    if (packageData.versions.length === 0) {
      throw new Error(`No versions available for package: ${name}`);
    }

    const wrapFileData = await fetchWrap(name, packageData.versions[0]);
    const metadata = await fetchMetadata(
      wrapFileData.sourceUrl || "",
      packageData.versions[0],
      context.cloudflare.env,
    );

    return {
      name: name,
      error: null,
      packageData,
      wrapFileData,
      metadata,
    };
  } catch (error) {
    console.error("Failed to fetch package data:", error);
    return {
      name: name,
      error: "error",
    };
  }
}

// --- Component ---
export default function PackageDetailPage() {
  const pkg = useLoaderData<typeof loader>();

  const renderNameList = (names: string[]) => {
    if (names.length === 0)
      return <p className="text-gray-600 dark:text-gray-400">None</p>;
    return (
      <div className="flex flex-wrap gap-2">
        {names.map((name) => (
          <span
            key={name}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-full"
          >
            {name}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen pt-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-8">
          <Link
            to="/"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 transition-colors"
          >
            &larr; Back to search
          </Link>
          <h1 className="text-5xl font-bold mt-4">{pkg.name}</h1>
          <div className="text-lg mt-4 space-y-2">
            <p className="text-gray-600 dark:text-gray-400">
              {pkg.error === null
                ? pkg.metadata.description
                : pkg.error === "notFound"
                  ? "Package not found in WrapDB."
                  : "An error occurred while fetching package information."}
            </p>
            {pkg.error === null && pkg.metadata.repo && (
              <div className="flex items-center gap-4 text-lg">
                <a
                  href={`https://github.com/${pkg.metadata.repo.owner}/${pkg.metadata.repo.name}`}
                  target="_blank"
                  rel="noopener"
                  className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <GithubIcon className="w-5 h-5 mr-2" />
                  <span>
                    {pkg.metadata.repo.owner}/{pkg.metadata.repo.name}
                  </span>
                </a>
                {pkg.metadata.upstreamVersion && (
                  <div className="flex items-center text-base text-gray-600 dark:text-gray-400">
                    <TagIcon className="w-4 h-4 mr-1" />
                    <span>{pkg.metadata.upstreamVersion}</span>
                    {pkg.metadata.isOutdated && (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold text-white bg-yellow-500 dark:bg-yellow-700 rounded-full">
                        Outdated
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            {pkg.error === null && pkg.metadata.homepage && (
              <p>
                <a
                  href={pkg.metadata.homepage}
                  target="_blank"
                  rel="noopener"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <LinkIcon className="inline-block w-5 h-5 mr-2" />
                  <span>{pkg.metadata.homepage}</span>
                </a>
              </p>
            )}
          </div>
        </header>

        {pkg.error === null && (
          <main className="space-y-6">
            <Section title="Available Versions">
              <div className="flex flex-wrap gap-2">
                {pkg.packageData.versions.map((v, i) => (
                  <span
                    key={v}
                    className={`px-3 py-1 text-sm rounded-full ${i === 0 ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"}`}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </Section>

            <Section title="Dependencies">
              {renderNameList(pkg.wrapFileData.dependencyNames)}
            </Section>

            <Section title="Programs">
              {renderNameList(pkg.wrapFileData.programNames)}
            </Section>

            <Section title="Usage (meson.build)">
              <CodeBlockWithCopyButton
                code={[
                  pkg.wrapFileData.dependencyNames.map(
                    (name) => `${name}_dep = dependency('${name}')`,
                  ),
                  pkg.wrapFileData.programNames.map(
                    (name) => `${name}_prog = find_program('${name}')`,
                  ),
                ]
                  .flat()
                  .join("\n")}
              />
            </Section>
          </main>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}

function LinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" />
    </svg>
  );
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

function TagIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  );
}
