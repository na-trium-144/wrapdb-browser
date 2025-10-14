import { useState } from "react";
import type { Route } from "./+types/home";
import { useNavigate } from "react-router";
import { Section } from "~/components/section";
import clsx from "clsx";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "WrapDB Browser" },
    {
      name: "description",
      content: "An unofficial browser for WrapDB packages.",
    },
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
    <>
      <div className="w-full max-w-3xl text-center">
        <header className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2 text-content-0 dark:text-content-0d">
            WrapDB Browser
          </h1>
          <p className="text-lg sm:text-xl text-content-2 dark:text-content-2d">
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
                className={clsx(
                  "w-full p-4 text-lg bg-base-2 dark:bg-base-2d",
                  "border border-base-3 dark:border-base-3d rounded-lg",
                  "placeholder-content-3 dark:placeholder-content-3d text-content-0 dark:text-content-0d",
                  "focus:outline-none focus:ring-2 focus:ring-link dark:focus:ring-linkd",
                  "focus:border-link dark:focus:border-linkd",
                )}
              />
            </form>
          </div>

          <Section
            title="What is this site?"
            className="mb-8 mx-auto max-w-160"
          >
            This is an unofficial web interface for searching packages available
            on WrapDB. You can quickly find the Meson build system wrap files
            you need.
          </Section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Section title="What is WrapDB?">
              WrapDB is the official package repository for the Meson build
              system. It provides a collection of build definitions (wraps) for
              various third-party libraries.
            </Section>

            <Section title="What is Meson?">
              Meson is an open-source build system designed to be both extremely
              fast and as user-friendly as possible. It uses a simple,
              non-turing-complete DSL to define builds.
            </Section>
          </div>
        </main>
      </div>
    </>
  );
}
