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
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
            {pkg.error === null
              ? pkg.metadata.description
              : pkg.error === "notFound"
                ? "Package not found in WrapDB."
                : "An error occurred while fetching package information."}
          </p>
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
