import { useCallback, useEffect, useRef, useState } from "react";
import type { Route } from "./+types/home";
import { Link, useNavigate } from "react-router";
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

type Suggestion = {
  name: string;
  latest_version: string;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const navigate = useNavigate();

  const suggestionController = useRef(new AbortController());
  useEffect(() => {
    setSuggestions([]);

    if (query.trim().length < 2) {
      return;
    }

    suggestionController.current = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/search_suggestions?q=${encodeURIComponent(query.trim())}`, {
        signal: suggestionController.current.signal,
      })
        .then((res) => res.json() as Promise<{ suggestions: Suggestion[] }>)
        .then((data) => setSuggestions(data.suggestions || []))
        .catch((error) => {
          if (error.name !== "AbortError") {
            console.error("Failed to fetch suggestions:", error);
          }
        });
    }, 300); // 300ms debounce

    return () => {
      clearTimeout(timer);
      suggestionController.current.abort();
    };
  }, [query]);
  const abortSuggestion = useCallback(() => {
    suggestionController.current.abort();
    setSuggestions([]);
  }, []);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) {
      setSuggestions([]);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  useEffect(() => {
    window.addEventListener("click", abortSuggestion);
    return () => {
      window.removeEventListener("click", abortSuggestion);
    };
  }, []);

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
          <div className="relative search-container mb-12 w-full max-w-120 mx-auto">
            <form onSubmit={handleSearch} className="flex">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a package (e.g., zlib, libpng)"
                className={clsx(
                  "flex-1 px-4 py-2 text-lg bg-base-2 dark:bg-base-2d",
                  "border border-base-3 dark:border-base-3d border-r-transparent rounded-l-lg",
                  "placeholder-content-3 dark:placeholder-content-3d text-content-0 dark:text-content-0d",
                  "focus:outline-none focus:ring-2 focus:ring-link dark:focus:ring-linkd",
                )}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    abortSuggestion();
                  }
                }}
                autoComplete="off"
              />
              <button
                type="submit"
                className={clsx(
                  "w-24 bg-link text-base-0 rounded-r-lg",
                  "hover:bg-linkh focus:bg-linkh",
                  "focus:outline-none focus:ring-2 focus:ring-link dark:focus:ring-linkd",
                  "transition-colors cursor-pointer",
                )}
              >
                Search
              </button>
            </form>
            {suggestions.length > 0 && (
              <ul
                className={clsx(
                  "absolute left-0 right-24 z-10 mt-1 overflow-hidden",
                  "bg-base-1 dark:bg-base-1d border border-base-3 dark:border-base-3d rounded-lg",
                  "shadow-lg text-left",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {suggestions.map((suggestion) => (
                  <li key={suggestion.name}>
                    <Link
                      to={`/package/${suggestion.name}/${suggestion.latest_version}`}
                      className={clsx(
                        "block px-4 py-3 text-base text-content-0 dark:text-content-0d",
                        "hover:bg-base-2 dark:hover:bg-base-2d",
                      )}
                    >
                      {suggestion.name}
                      <span
                        className={clsx(
                          "inline-block ml-2 px-2 py-1 text-xs rounded-full",
                          "bg-base-2 text-content-1 dark:bg-base-2d dark:text-content-1d",
                          "border border-base-3 dark:border-base-3d",
                        )}
                      >
                        {suggestion.latest_version}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
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
