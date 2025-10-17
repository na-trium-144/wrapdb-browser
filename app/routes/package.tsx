import React, { useMemo } from "react";
import { useLoaderData, useNavigate } from "react-router";
import type { Route } from "./+types/package";
import {
  getVersionsForPackageFromDB,
  type PackageFromDB,
  type VersionFromDB,
  getOrUpdatePackageInDB,
  getOrUpdateVersionInDB,
} from "~/utils/d1";
import { Section } from "~/components/section";
import clsx from "clsx";
import { GithubIcon, LinkIcon, TagIcon } from "~/components/icon";
import useSWR from "swr";
import JSZip from "jszip";
import { Header } from "~/components/header";
import { CodeBlock } from "~/components/code-block";
import {
  parseMesonOptions,
  type MesonOption,
  type MesonValue,
} from "~/utils/optionParser";
import { fetchWrap } from "~/utils/wrapdb";
import { DisplayUpstreamRepo } from "~/components/upstreamRepo";
import type { RepoType } from "~/utils/metadata";

type PackageDetail = {
  name: string;
  version: string;
  error: null | "notFound" | "error";
  title: string;
  description: string;
  packageData?: PackageFromDB;
  versionData?: VersionFromDB;
  allVersions?: string[];
};

// --- Data Loader ---
export async function loader({
  params,
  context,
}: Route.LoaderArgs): Promise<PackageDetail> {
  const name = params.name || "";
  const version = params.version || "";
  const db = context.cloudflare.env.DB;

  try {
    // 1. Fetch main data from D1
    const [pkgFromDB, versionFromDB, allVersionsFromDB] = await Promise.all([
      getOrUpdatePackageInDB(db, name, context.env, null),
      getOrUpdateVersionInDB(db, name, version),
      getVersionsForPackageFromDB(db, name),
    ]);

    if (!pkgFromDB || !versionFromDB) {
      return {
        name,
        version,
        error: "notFound",
        title: "Package Not Found - WrapDB Browser",
        description: "The requested package could not be found in WrapDB.",
      };
    }

    return {
      name,
      version,
      error: null,
      packageData: pkgFromDB,
      versionData: versionFromDB,
      allVersions: allVersionsFromDB.map((v) => v.version),
      title: `${name} ${version} - WrapDB Browser`,
      description: pkgFromDB.description || `${name} ${version}`,
    };
  } catch (error) {
    console.error("Failed to fetch package data:", error);
    return {
      name,
      version,
      error: "error",
      title: "Error - WrapDB Browser",
      description: "An error occurred while fetching package information.",
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
    [
      pkg.name,
      pkg.version,
      pkg.error === null && !!pkg.versionData?.has_patch_url,
    ],
    patchFetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const options = useMemo<MesonOption[]>(() => {
    if (typeof patchSWR.data?.["meson_options.txt"] === "string") {
      return parseMesonOptions(patchSWR.data["meson_options.txt"]);
    } else if (typeof patchSWR.data?.["meson.options"] === "string") {
      return parseMesonOptions(patchSWR.data["meson.options"]);
    } else {
      return [];
    }
  }, [patchSWR.data]);

  if (pkg.error) {
    return (
      <>
        <title>{pkg.title}</title>
        <meta name="description" content={pkg.description} />
        <Header />
        <div className="mt-24 w-full max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold mt-4 text-content-0 dark:text-content-0d">
            {pkg.name}
          </h1>
          <p className="text-lg mt-4 text-content-2 dark:text-content-2d">
            {pkg.error === "notFound"
              ? "Package or version not found in WrapDB."
              : "An error occurred while fetching package information."}
          </p>
        </div>
      </>
    );
  }

  const { name, version, packageData, versionData, allVersions } = pkg;

  return (
    <>
      <title>{pkg.title}</title>
      <meta name="description" content={pkg.description} />
      <Header />
      <div className="mt-24 w-full max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold mt-4 text-content-0 dark:text-content-0d">
          {name}
        </h1>
        <div className="text-lg mt-4 space-y-2">
          <p className="text-content-2 dark:text-content-2d">
            {packageData?.description ? (
              packageData.description
            ) : (
              <>
                <p className="">
                  Metadata for this package is not yet available.
                </p>
                {versionData?.source_url && (
                  <p className="">
                    Source URL is{" "}
                    <a
                      href={versionData.source_url}
                      target="_blank"
                      rel="noopener"
                      className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline"
                    >
                      {versionData.source_url}
                    </a>
                    .
                  </p>
                )}
              </>
            )}
          </p>
          {packageData?.repo_type && (
            <div className="text-lg">
              <DisplayUpstreamRepo
                className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline"
                repoType={packageData.repo_type as RepoType}
                owner={packageData.repo_owner!}
                name={packageData.repo_name!}
              />
              {packageData.latest_upstream_version && (
                <div className="inline-block text-base text-content-2 dark:text-content-2d ml-4">
                  <span className="text-sm">Latest Upstream Version:</span>
                  <TagIcon className="inline-block w-4 h-4 ml-1 mr-1" />
                  <span>{packageData.latest_upstream_version}</span>
                  {!!packageData.is_outdated && (
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
          {packageData?.homepage && (
            <p>
              <a
                href={packageData.homepage}
                target="_blank"
                rel="noopener"
                className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline"
              >
                <LinkIcon className="inline-block w-5 h-5 mr-2" />
                <span>{packageData.homepage}</span>
              </a>
            </p>
          )}
        </div>
        <div className="text-sm italic text-content-2 dark:text-content-2d mt-3">
          Package metadata is not taken from the WrapDB database and may be
          inaccurate. See{" "}
          <a
            href="https://github.com/na-trium-144/wrapdb-browser/issues/12"
            target="_blank"
            rel="noopener"
            className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline"
          >
            this issue
          </a>{" "}
          for details.
        </div>

        <main className="mt-6 space-y-6">
          <h2 className="flex flex-row items-baseline gap-4">
            <span className="text-xl font-semibold">Version:</span>
            <select
              value={version}
              onChange={(e) => navigate(`/package/${name}/${e.target.value}`)}
              className="p-2 border rounded-md bg-base-1 dark:bg-base-1d border-base-2 dark:border-base-2d"
            >
              {allVersions
                ?.filter(
                  (v, i) => !allVersions[i - 1]?.startsWith(v.split("-")[0]),
                )
                .map((v) => (
                  <option key={v} value={v}>
                    {v}
                    {v === packageData?.latest_version ? " (latest)" : ""}
                  </option>
                ))}
            </select>
          </h2>

          <Section title="Usage">
            {version === packageData?.latest_version ? (
              <>
                <p className="mb-4">
                  Install the latest {name} package with the following command:
                </p>
                <CodeBlock copyButton>{`meson wrap install ${name}`}</CodeBlock>
                <p className="mt-4 mb-4">
                  Or, download the wrap file directly from
                  <a
                    href={`https://wrapdb.mesonbuild.com/v2/${name}_${version}/${name}.wrap`}
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
                To use version {version} of {name}, you need to manually
                download the wrap file from
                <a
                  href={`https://wrapdb.mesonbuild.com/v2/${name}_${version}/${name}.wrap`}
                  target="_blank"
                  rel="noopener"
                  className="text-link dark:text-linkd hover:text-linkh dark:hover:text-linkdh hover:underline mx-1"
                >
                  this link
                </a>
                and place it in the 'subprojects' directory of your project.
              </p>
            )}
            {versionData && (
              <>
                <div className="border-b border-base-2 dark:border-base-2d mb-4" />
                <p className="mb-4">
                  Libraries (or programs) from {name} {version} can be used by
                  adding the following lines to your meson.build file:
                </p>
                <CodeBlock copyButton language="meson">
                  {[
                    (JSON.parse(versionData.dependency_names) as string[]).map(
                      (depName) => `${depName}_dep = dependency('${depName}')`,
                    ),
                    (JSON.parse(versionData.program_names) as string[]).map(
                      (progName) =>
                        `${progName}_prog = find_program('${progName}')`,
                    ),
                  ]
                    .flat()
                    .join("\n")}
                </CodeBlock>
              </>
            )}
          </Section>

          {!!versionData?.has_patch_url && (
            <Section title="Project Options">
              {patchSWR.data ? (
                options.length >= 1 ? (
                  <>
                    <p className="text-sm italic">
                      Bold values indicate the default value.
                    </p>
                    <ul className="list-disc list-outside pl-4 mt-1 space-y-1">
                      {options.map((option) => (
                        <OptionItem
                          key={option.name}
                          pkgName={name}
                          option={option}
                        />
                      ))}
                    </ul>
                  </>
                ) : (
                  <p>No options available in this package.</p>
                )
              ) : patchSWR.error ? (
                <p>Could not load patch files.</p>
              ) : (
                patchSWR.isLoading && <p>Loading patch files...</p>
              )}
            </Section>
          )}

          <Section title="Patch Files Preview">
            {!versionData?.has_patch_url ? (
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
      </div>
    </>
  );
}

function OptionItem({
  pkgName,
  option,
}: {
  pkgName: string;
  option: MesonOption;
}) {
  let value: MesonValue | MesonValue[];
  let choices: MesonValue[] | null = null;
  switch (option.type) {
    case "boolean":
      value = option.value ?? true;
      choices = [true, false];
      break;
    case "string":
      value = option.value ?? "";
      break;
    case "combo":
      value = option.value ?? option.choices?.[0] ?? "";
      choices = option.choices ?? [];
      break;
    case "integer":
      value = option.value ?? 0;
      break;
    case "array":
      value = option.value ?? [];
      break;
    case "feature":
      value = option.value ?? "auto";
      choices = ["auto", "enabled", "disabled"];
      break;
    default:
      console.warn(`Unknown option type: ${option.type}`);
      value = option.value || "";
  }
  return (
    <li>
      <p className="">
        <span className="text-base">{pkgName}</span>
        <span className="text-base mx-0.5">:</span>
        <span className="text-lg font-semibold">{option.name}</span>
        {/*<span
          className={clsx(
            "inline-block ml-1 px-1.5 py-0.5 text-xs rounded-full",
            "bg-base-2 text-content-1 dark:bg-base-2d dark:text-content-1d",
            "border border-base-3 dark:border-base-3d",
          )}
        >
          {option.type}
        </span>*/}
        {option.yield && (
          <span
            className={clsx(
              "inline-block ml-1 px-1.5 py-0.5 text-xs rounded-full",
              "bg-base-2 text-content-1 dark:bg-base-2d dark:text-content-1d",
              "border border-base-3 dark:border-base-3d",
            )}
          >
            yield
          </span>
        )}
        <span className="ml-1 mr-1">=</span>
        {choices ? (
          choices.map((choice, index) => (
            <>
              {index > 0 && (
                <span key={index} className="mx-1 text-sm">
                  /
                </span>
              )}
              <DisplayMesonValue
                value={choice}
                className={clsx(choice === value ? "font-bold" : "text-sm!")}
              />
            </>
          ))
        ) : (
          <span className="ml-1 px-2 py-1 text-sm bg-base-2 dark:bg-base-2d rounded-full">
            {String(value)}
          </span>
        )}
        {(typeof option.min === "number" || typeof option.max === "number") && (
          <span className="font-sans text-sm ml-2">
            (min: {option.min}, max: {option.max})
          </span>
        )}
      </p>
      {option.description && <p className="ml-4">{option.description}</p>}
      <p className="ml-4 text-sm italic">
        {option.deprecated === true ? (
          "This option is deprecated."
        ) : typeof option.deprecated === "string" ? (
          `This option is deprecated. Use ${option.deprecated}`
        ) : Array.isArray(option.deprecated) ? (
          <>
            {option.deprecated.length > 1 ? "The values " : "The value "}
            {option.deprecated.map((v, i) => (
              <span key={i}>
                {i > 0 && <span>,</span>}
                <DisplayMesonValue value={v} />
              </span>
            ))}
            {option.deprecated.length > 1 ? " are " : " is "}
            deprecated.
          </>
        ) : typeof option.deprecated === "object" ? (
          <>
            The deprecated
            {Object.keys(option.deprecated).length > 1 ? " values " : " value "}
            {Object.keys(option.deprecated).map((v, i) => (
              <span key={i}>
                {i > 0 && <span>,</span>}
                <DisplayMesonValue value={v} />
              </span>
            ))}{" "}
            will be remapped to{" "}
            {Object.values(option.deprecated).map((v, i) => (
              <span key={i}>
                {i > 0 && <span>,</span>}
                <DisplayMesonValue value={v} />
              </span>
            ))}
            {Object.keys(option.deprecated).length > 1 ? " respectively" : ""}.
          </>
        ) : null}
      </p>
    </li>
  );
}
function DisplayMesonValue({
  value,
  className,
}: {
  value: MesonValue;
  className?: string;
}) {
  if (typeof value === "boolean") {
    return (
      <span
        className={clsx(
          "font-mono text-base text-amber-600 dark:text-amber-500",
          className,
        )}
      >
        {value ? "true" : "false"}
      </span>
    );
  } else if (typeof value === "number") {
    return (
      <span
        className={clsx(
          "font-mono text-base text-amber-600 dark:text-amber-500",
          className,
        )}
      >
        {String(value)}
      </span>
    );
  } else if (typeof value === "string") {
    if (value === "auto" || value === "enabled" || value === "disabled") {
      // todo: 'auto' という文字列型の値も理論上はあり得るので、feature型引数かどうかで分岐するべき
      return (
        <span
          className={clsx(
            "font-mono text-base text-blue-500 dark:text-blue-400",
            className,
          )}
        >
          {value}
        </span>
      );
    } else {
      return (
        <>
          <span className="select-none">'</span>
          <span
            className={clsx(
              "font-mono text-base text-green-600 dark:text-green-500",
              className,
            )}
          >
            {value}
          </span>
          <span className="select-none">'</span>
        </>
      );
    }
  }
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
            /\/?meson.build$|^meson_options.txt$|^meson.options$/.test(
              selectedFile,
            )
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
