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
import { Section } from "~/components/section";
import clsx from "clsx";
import { GithubIcon, LinkIcon, TagIcon } from "~/components/icon";

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
    <>
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-6">
          <Link
            to="/"
            className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh dark:hover:text-blue-500 transition-colors"
          >
            &larr; Back to search
          </Link>
          <h1 className="text-5xl font-bold mt-4 text-content-0 dark:text-content-0d">{pkg.name}</h1>
          <div className="text-lg mt-4 space-y-2">
            <p className="text-content-2 dark:text-content-2d">
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
                  className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline"
                >
                  <GithubIcon className="inline-block w-5 h-5 mr-2" />
                  <span>
                    {pkg.metadata.repo.owner}/{pkg.metadata.repo.name}
                  </span>
                </a>
                {pkg.metadata.upstreamVersion && (
                  <div className="inline-block text-base text-content-2 dark:text-content-2d ml-4">
                    <span className="text-sm">Latest Upstream Version:</span>
                    <TagIcon className="inline-block w-4 h-4 ml-1 mr-1" />
                    <span>{pkg.metadata.upstreamVersion}</span>
                    {pkg.metadata.isOutdated && (
                      <span className={clsx("ml-2 px-2 py-1 text-xs",
                        "text-base-0 bg-warn rounded-full")}>
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
                  className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline"
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
            <h2 className="flex flex-row items-baseline gap-4">
              <span className="text-xl font-semibold">
                Version:
              </span>
              <select
                value={pkg.version}
                onChange={(e) =>
                  navigate(`/package/${params.name}/${e.target.value}`)
                }
                className="p-2 border rounded-md bg-base-1 dark:bg-base-1d border-base-2 dark:border-base-2d"
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
            </h2>

            <Section title="Usage">
              {pkg.version === pkg.packageData.versions[0] ? (
                <>
                  <p className="mb-4">
                    Install the latest {pkg.name} package with the following command:
                  </p>
                  <CodeBlockWithCopyButton
                    code={`meson wrap install ${pkg.name}`}
                  />
                  <p className="mt-4 mb-4">
                    Or, download the wrap file directly from
                    <a
                      href={`https://wrapdb.mesonbuild.com/v2/${pkg.name}_${pkg.version}/${pkg.name}.wrap`}
                      target="_blank"
                      rel="noopener"
                      className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline mx-1"
                    >
                      this link
                    </a>
                    and place it in the 'subprojects' directory of your project.
                  </p>
                </>
              ) : (
                <p className="mb-4">
                  To use version {pkg.version} of {pkg.name}, you need to
                  manually download the wrap file from
                  <a
                    href={`https://wrapdb.mesonbuild.com/v2/${pkg.name}_${pkg.version}/${pkg.name}.wrap`}
                    target="_blank"
                    rel="noopener"
                    className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline mx-1"
                  >
                    this link
                  </a>
                  and place it in the 'subprojects' directory of your project.
                </p>
              )}
              <div className="border-b border-base-2 dark:border-base-2d mb-4" />
              <p className="mb-4">
                Libraries (or programs) from {pkg.name} {pkg.version} can be used
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
    </>
  );
}
