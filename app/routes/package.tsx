import React from "react";
import { useLoaderData, useNavigate } from "react-router";
import type { Route } from "./+types/package";
import {
  fetchReleases,
  fetchWrap,
  type WrapDbPackageData,
  type WrapFileData,
} from "~/utils/wrapdb";
import { fetchMetadata, type PackageMetadata } from "~/utils/metadata";
import { Section } from "~/components/section";
import clsx from "clsx";
import { GithubIcon, LinkIcon, TagIcon } from "~/components/icon";
import useSWR from "swr";
import JSZip from "jszip";
import { Header } from "~/components/header";
import { CodeBlock } from "~/components/code-block";

// --- Types ---
type PackageDetail =
  | {
      name: string;
      version: string;
      error: null;
      packageData: WrapDbPackageData;
      wrapFileData: WrapFileData;
      metadata?: PackageMetadata;
      title: string;
      description: string;
    }
  | {
      name: string;
      version: string;
      error: "notFound" | "error";
      title: string;
      description: string;
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
        title: "Package Not Found - WrapDB Browser",
        description: "The requested package could not be found in WrapDB.",
      };
    }

    const wrapFileData = fetchWrap(name, version);

    // 選択したバージョンによらず常に最新のものを取得
    const latestWrapFileData = fetchWrap(name, packageData.versions[0]);
    const metadata = await latestWrapFileData.then((latestWrapFileData) =>
      fetchMetadata(
        latestWrapFileData.sourceUrl,
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
      metadata: metadata,
      title: `${name} ${version} - WrapDB Browser`,
      description: metadata?.description
        ? metadata.description
        : `${name} ${version}`,
    };
  } catch (error) {
    console.error("Failed to fetch package data:", error);
    return {
      name: name,
      version: version,
      error: "error",
      title: "Error - WrapDB Browser",
      description:
        "An error occurred while fetching package information. Please try again later.",
    };
  }
}

async function patchFetcher([name, version, hasPatchUrl]: [
  string,
  string,
  boolean,
]): Promise<Record<string, string> | null> {
  if (!hasPatchUrl) return null;
  return fetch(`/get_patch/${name}/${version}`).then(async (res) => {
    if (!res.ok) throw new Error(`Failed to fetch patch: ${res.statusText}`);
    const zip = await JSZip.loadAsync(res.blob());
    const extractedFiles: Record<string, string> = {};
    for (const filename in zip.files) {
      if (!zip.files[filename].dir) {
        // Exclude directories
        const content = await zip.files[filename].async("text"); // Or "text", "arraybuffer"
        // トップレベルのディレクトリを取り除く
        extractedFiles[filename.split("/").slice(1).join("/")] = content;
        // You can then do something with the content, e.g., display it or save it
      }
    }
    return extractedFiles;
  });
}

// --- Component ---
export default function PackageDetailPage() {
  const pkg = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const patchSWR = useSWR(
    [pkg.name, pkg.version, pkg.error === null && pkg.wrapFileData.hasPatchUrl],
    patchFetcher,
    {
      revalidateOnFocus: false,
    },
  );

  return (
    <>
      <title>{pkg.title}</title>
      <meta name="description" content={pkg.description} />
      <Header />
      <div className="mt-24 w-full max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mt-4 text-content-0 dark:text-content-0d">
          {pkg.name}
        </h1>
        <div className="text-lg mt-4 space-y-2">
          <p className="text-content-2 dark:text-content-2d">
            {pkg.error === null ? (
              pkg.metadata ? (
                pkg.metadata.description
              ) : (
                <>
                  <p className="">
                    Metadata for this package is not yet available in WrapDB
                    Browser.
                  </p>
                  <p className="">
                    Source URL is{" "}
                    <a
                      href={pkg.wrapFileData.sourceUrl}
                      target="_blank"
                      rel="noopener"
                      className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline"
                    >
                      {pkg.wrapFileData.sourceUrl}
                    </a>
                    .
                  </p>
                </>
              )
            ) : pkg.error === "notFound" ? (
              "Package not found in WrapDB."
            ) : (
              "An error occurred while fetching package information."
            )}
          </p>
          {pkg.error === null && pkg.metadata?.repo && (
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
                    <span
                      className={clsx(
                        "ml-2 px-2 py-1 text-xs",
                        "text-base-0 bg-warn rounded-full",
                      )}
                    >
                      Outdated
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          {pkg.error === null && pkg.metadata?.homepage && (
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
        <div className="text-sm italic text-content-2 dark:text-content-2d mt-3">
          Package metadata is not taken from the WrapDB database and may be
          inaccurate. If you find any problems, search an issue or PR{" "}
          <a
            href={`https://github.com/na-trium-144/wrapdb-browser/issues?q=is%3Aopen+${pkg.name}`}
            target="_blank"
            rel="noopener"
            className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline"
          >
            on GitHub
          </a>
          , or file a new one.
        </div>

        {pkg.error === null && (
          <main className="mt-6 space-y-6">
            <h2 className="flex flex-row items-baseline gap-4">
              <span className="text-xl font-semibold">Version:</span>
              <select
                value={pkg.version}
                onChange={(e) =>
                  navigate(`/package/${pkg.name}/${e.target.value}`)
                }
                className="p-2 border rounded-md bg-base-1 dark:bg-base-1d border-base-2 dark:border-base-2d"
              >
                {pkg.packageData.versions
                  .filter(
                    (v, i) =>
                      // 同じパッケージバージョンが複数ある場合は最新のリビジョンのみを表示
                      !pkg.packageData.versions[i - 1]?.startsWith(
                        v.split("-")[0],
                      ),
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
                    Install the latest {pkg.name} package with the following
                    command:
                  </p>
                  <CodeBlock
                    copyButton
                  >{`meson wrap install ${pkg.name}`}</CodeBlock>
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
                Libraries (or programs) from {pkg.name} {pkg.version} can be
                used by adding the following lines to your meson.build file:
              </p>
              <CodeBlock copyButton language="meson">
                {[
                  pkg.wrapFileData.dependencyNames.map(
                    (name) => `${name}_dep = dependency('${name}')`,
                  ),
                  pkg.wrapFileData.programNames.map(
                    (name) => `${name}_prog = find_program('${name}')`,
                  ),
                ]
                  .flat()
                  .join("\n")}
              </CodeBlock>
            </Section>

            <Section title="Patch Files Preview">
              {!pkg.wrapFileData.hasPatchUrl ? (
                <p>No patch files needed for this package.</p>
              ) : patchSWR.data ? (
                <PatchFilePreview files={patchSWR.data} />
              ) : patchSWR.error ? (
                <p>Could not load patch files.</p>
              ) : (
                patchSWR.isLoading && <p>Loading patch files...</p>
              )}
            </Section>
          </main>
        )}
      </div>
    </>
  );
}

function PatchFilePreview({ files }: { files: Record<string, string> }) {
  const sortedKeys = Object.keys(files);
  sortedKeys.sort();
  const [selectedFile, setSelectedFile] = React.useState(sortedKeys[0]);

  return (
    <div className="flex gap-4 h-64">
      <div className="w-1/4 h-full overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {sortedKeys.map((filename) => (
            <li key={filename}>
              <button
                onClick={() => setSelectedFile(filename)}
                className={clsx(
                  "text-sm w-full text-left px-2 py-1 rounded-md",
                  selectedFile === filename
                    ? "bg-link text-base-0"
                    : "hover:bg-base-2 dark:hover:bg-base-2d cursor-pointer",
                )}
              >
                {filename}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 min-w-0 h-full">
        <CodeBlock
          showLineNumbers
          className="h-full"
          divClassName="h-full"
          language={
            /\/?meson.build$|^meson_options.txt$/.test(selectedFile)
              ? "meson"
              : "text"
          }
        >
          {files[selectedFile]}
        </CodeBlock>
      </div>
    </div>
  );
}
