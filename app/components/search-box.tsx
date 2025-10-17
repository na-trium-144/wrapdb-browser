import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Suggestion } from "~/routes/search_suggestions";
import { Spinner } from "./spinner";

type SearchBoxProps = {
  className?: string;
  inputClassName?: string;
  submitClassName?: string;
  submitContent: React.ReactNode;
};
export function SearchBox({
  className,
  inputClassName,
  submitClassName,
  submitContent,
}: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

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
      setIsNavigating(true);
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)!.then(() =>
        setIsNavigating(false),
      );
    }
  };

  useEffect(() => {
    window.addEventListener("click", abortSuggestion);
    return () => {
      window.removeEventListener("click", abortSuggestion);
    };
  }, []);

  return (
    <div className={clsx(className)}>
      <form onSubmit={handleSearch} className="flex">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a package (e.g., zlib, libpng)"
            className={clsx(
              inputClassName,
              "w-full bg-base-2 dark:bg-base-2d",
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
          {suggestions.length > 0 && (
            <ul
              className={clsx(
                "absolute inset-x-0 z-10 mt-1 overflow-hidden",
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
        <button
          type="submit"
          className={clsx(
            submitClassName,
            "bg-link text-base-0 rounded-r-lg",
            "hover:bg-linkh focus:bg-linkh",
            "focus:outline-none focus:ring-2 focus:ring-link dark:focus:ring-linkd",
            "transition-colors cursor-pointer",
            "disabled:bg-base-3 hover:disabled:bg-base-3 disabled:cursor-not-allowed",
            "dark:disabled:bg-base-3d hover:dark:disabled:bg-base-3d",
            "relative",
          )}
          disabled={isNavigating}
        >
          {isNavigating && <Spinner />}
          <span className={clsx(isNavigating && "invisible")}>
            {submitContent}
          </span>
        </button>
      </form>
    </div>
  );
}
