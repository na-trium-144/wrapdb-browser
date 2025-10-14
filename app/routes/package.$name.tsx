import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/package.$name";

// --- Types ---
type PackageDetail = {
  name: string;
  latest_version: string;
  versions: string[];
  description: string;
  usage: string;
};

// --- Data Loader ---
export async function loader({ params }: Route.LoaderArgs): Promise<PackageDetail> {
  const name = params.name || "";
  
  // Simulate a network delay and return dummy data
  await new Promise(res => setTimeout(res, 100));

  return {
    name: name,
    latest_version: "1.2.11-1",
    versions: ["1.2.11-1", "1.2.10-1", "1.2.9-1"],
    description: "A massively spiffy yet delicately unobtrusive compression library. It is one of the most popular open source libraries.",
    usage: `[wrap-git]
url = https://github.com/madler/zlib.git
revision = v1.2.11

[provide]
zlib = zlib_dep`
  };
}

// --- Component ---
export default function PackageDetailPage() {
  const pkg = useLoaderData<typeof loader>();

  const renderSection = (title: string, content: React.ReactNode) => (
    <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">{title}</h2>
      {content}
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen pt-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-8">
          <Link to="/" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 transition-colors">&larr; Back to search</Link>
          <h1 className="text-5xl font-bold mt-4">{pkg.name}</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">{pkg.description}</p>
        </header>

        <main className="space-y-6">
          {renderSection("Usage (meson.build)", (
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
              <code>{pkg.usage}</code>
            </pre>
          ))}

          {renderSection("Available Versions", (
            <div className="flex flex-wrap gap-2">
              {pkg.versions.map(v => (
                <span key={v} className={`px-3 py-1 text-sm rounded-full ${v === pkg.latest_version ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                  {v}
                </span>
              ))}
            </div>
          ))}
        </main>
      </div>
    </div>
  );
}
