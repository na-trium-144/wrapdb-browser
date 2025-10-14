import React from "react";
import { useLoaderData, Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/package.$name.$version";
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
      version: string;
      error: null;
      packageData: WrapDbPackageData;
      wrapFileData: WrapFileData;
      metadata: PackageMetadata;
    }
  | {
      name: string;
      version: string;
      error: "notFound" | "error";
    };

// --- Data Loader ---
export async function loader({
  params,
  context,
}: Route.LoaderArgs): Promise<PackageDetail> {
  const name = params.name || "";
  const version = params.version || "";

  try {
    const packages = await fetchReleases();
    const packageData = packages[name];

    if (!packageData || !packageData.versions.includes(version)) {
      return {
        name: name,
        version: version,
        error: "notFound",
      };
    }

    const wrapFileData = fetchWrap(name, version);

    // 選択したバージョンによらず常に最新のものを取得
    const latestWrapFileData = fetchWrap(name, packageData.versions[0]);
    const metadata = latestWrapFileData.then((latestWrapFileData) =>
      fetchMetadata(
        latestWrapFileData.sourceUrl || "",
        packageData.versions[0],
        context.cloudflare.env,
      ),
    );

    return {
      name: name,
      version: version,
      error: null,
      packageData,
      wrapFileData: await wrapFileData,
      metadata: await metadata,
    };
  } catch (error) {
    console.error("Failed to fetch package data:", error);
    return {
      name: name,
      version: version,
      error: "error",
    };
  }
}

// --- Component ---
export default function PackageDetailPage() {
  const pkg = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const params = useParams();

  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen pt-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-6">
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
              <div className="text-lg">
                <a
                  href={`https://github.com/${pkg.metadata.repo.owner}/${pkg.metadata.repo.name}`}
                  target="_blank"
                  rel="noopener"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <GithubIcon className="inline-block w-5 h-5 mr-2" />
                  <span>
                    {pkg.metadata.repo.owner}/{pkg.metadata.repo.name}
                  </span>
                </a>
                {pkg.metadata.upstreamVersion && (
                  <div className="inline-block text-base text-gray-600 dark:text-gray-400 ml-4">
                    <span className="text-sm">Latest Upstream Version:</span>
                    <TagIcon className="inline-block w-4 h-4 ml-1 mr-1" />
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
            <div className="flex flex-row items-baseline gap-4">
              <span className="text-xl font-semibold text-gray-800 dark:text-gray-300">
                Version:
              </span>
              <select
                value={pkg.version}
                onChange={(e) =>
                  navigate(`/package/${params.name}/${e.target.value}`)
                }
                className="p-2 border rounded-md bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              >
                {pkg.packageData.versions
                  .filter(
                    (v, i) =>
                      // 同じパッケージバージョンが複数ある場合は最新のリビジョンのみを表示
                      !pkg.packageData.versions
                        .at(i - 1)
                        ?.startsWith(v.split("-")[0]),
                  )
                  .map((v) => (
                    <option key={v} value={v}>
                      {v}
                      {v === pkg.packageData.versions[0] ? " (latest)" : ""}
                    </option>
                  ))}
              </select>
            </div>

            <Section title="Usage">
              {pkg.version === pkg.packageData.versions[0] ? (
                <>
                  <p className="mb-4 text-gray-700 dark:text-gray-300">
                    Install the latest {pkg.name} package with the following command:
                  </p>
                  <CodeBlockWithCopyButton
                    code={`meson wrap install ${pkg.name}`}
                  />
                  <p className="mt-4 mb-4 text-gray-700 dark:text-gray-300">
                    Or, download the wrap file directly from
                    <a
                      href={`https://wrapdb.mesonbuild.com/v2/${pkg.name}_${pkg.version}/${pkg.name}.wrap`}
                      target="_blank"
                      rel="noopener"
                      className="text-blue-600 dark:text-blue-400 hover:underline mx-1"
                    >
                      this link
                    </a>
                    and place it in the 'subprojects' directory of your project.
                  </p>
                </>
              ) : (
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                  To use version {pkg.version} of {pkg.name}, you need to
                  manually download the wrap file from
                  <a
                    href={`https://wrapdb.mesonbuild.com/v2/${pkg.name}_${pkg.version}/${pkg.name}.wrap`}
                    target="_blank"
                    rel="noopener"
                    className="text-blue-600 dark:text-blue-400 hover:underline mx-1"
                  >
                    this link
                  </a>
                  and place it in the 'subprojects' directory of your project.
                </p>
              )}
              <div className="border-b border-gray-200 dark:border-gray-700 mb-4" />
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Libraries (or programs) of {pkg.name} {pkg.version} can be used
                by adding the following lines to your meson.build file:
              </p>
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
