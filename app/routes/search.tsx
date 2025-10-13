import { useLoaderData, useSearchParams, Link } from "react-router";
import type { Route } from "./+types/search";

// --- Dummy Data ---
type Package = {
  name: string;
  description: string;
  version: string;
};

const dummyPackages: Package[] = [
  { name: "zlib", description: "A massively spiffy yet delicately unobtrusive compression library", version: "1.2.11" },
  { name: "libpng", description: "Portable Network Graphics library", version: "1.6.37" },
  { name: "libjpeg", description: "JPEG image compression library", version: "9d" },
  { name: "openssl", description: "A toolkit for TLS and SSL protocols, and a general-purpose cryptography library", version: "1.1.1k" },
  { name: "boost", description: "A set of high-quality, peer-reviewed, portable C++ source libraries", version: "1.76.0" },
  { name: "gtest", description: "Google's C++ testing framework", version: "1.10.0" },
];

// --- Data Loader ---
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.toLowerCase() || "";
  
  // Simulate a network delay
  await new Promise(res => setTimeout(res, 200));

  const results = query
    ? dummyPackages.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query))
    : [];

  return { results };
}

// --- Component ---
export default function Search() {
  const { results } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q");

  return (
    <div className="bg-gray-950 text-gray-100 min-h-screen pt-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            Search Results for: <span className="text-blue-400">{query}</span>
          </h1>
          <Link to="/" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            &larr; Back to Home
          </Link>
        </header>

        <main>
          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((pkg) => (
                <div key={pkg.name} className="bg-gray-900 p-6 rounded-lg border border-gray-800 hover:border-blue-500 transition-colors">
                  <h2 className="text-2xl font-semibold text-blue-400">{pkg.name}</h2>
                  <p className="text-sm text-gray-400 mb-2">Version: {pkg.version}</p>
                  <p className="text-gray-300">{pkg.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 text-center">
              <h2 className="text-2xl font-semibold mb-2">No results found.</h2>
              <p className="text-gray-400">Please try a different search term.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}