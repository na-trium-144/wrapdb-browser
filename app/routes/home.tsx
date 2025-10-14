import { useState } from "react";
import type { Route } from "./+types/home";
import { useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "WrapDB Browser" },
    { name: "description", content: "An unofficial browser for WrapDB packages." },
  ];
}

export default function Home() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col items-center justify-start pt-20 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl text-center">
        <header className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2">WrapDB Browser</h1>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400">
            The unofficial browser for WrapDB packages.
          </p>
        </header>

        <main>
          <div className="search-container mb-12">
            <form onSubmit={handleSearch}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a package (e.g., zlib, libpng)"
                className="w-full p-4 text-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </form>
          </div>

          <div className="descriptions text-left grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <h2 className="text-2xl font-semibold mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">What is this site?</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                This is an unofficial web interface for searching packages available on WrapDB. You can quickly find the Meson build system wrap files you need.
              </p>
            </section>

            <section className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800">
              <h2 className="text-2xl font-semibold mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">What is WrapDB?</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                WrapDB is the official package repository for the Meson build system. It provides a collection of build definitions (wraps) for various third-party libraries.
              </p>
            </section>

            <section className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 md:col-span-2">
              <h2 className="text-2xl font-semibold mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">What is Meson?</h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Meson is an open-source build system designed to be both extremely fast and as user-friendly as possible. It uses a simple, non-turing-complete DSL to define builds.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}