import clsx from "clsx";
import { ThemeToggle } from "./theme-toggle";
import { GithubIcon } from "./icon";
import { Link } from "react-router";
import { SearchBox } from "./search-box";

export function Header() {
  return (
    <header
      className={clsx(
        "fixed w-screen z-10 shadow-md p-4 bg-base-1 dark:bg-base-1d",
        "flex flex-row items-center gap-4",
      )}
    >
      <Link
        to="/"
        className={clsx(
          "text-3xl text-content-0 dark:text-content-0d font-bold",
          "hover:text-content-3 hover:dark:text-content-3d",
        )}
      >
        <img
          src="/icon.svg"
          alt="WrapDB Browser"
          className="inline-block h-8 -translate-y-0.5 mr-2"
        />
        <h1 className="hidden sm:inline">WrapDB Browser</h1>
      </Link>
      <div className="flex-1">
        <SearchBox
          className="w-full max-w-88 ml-auto mr-auto sm:mr-0"
          inputClassName="px-2 py-1 text-base"
          submitClassName="px-2 text-base"
          submitContent={
            <svg
              width="20"
              height="20"
              viewBox="0 0 512 512"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              strokeWidth={(2 * 512) / 24}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M221.09,64A157.09,157.09,0,1,0,378.18,221.09,157.1,157.1,0,0,0,221.09,64Z" />
              <line x1="338.29" y1="338.29" x2="448" y2="448" />
            </svg>
          }
        />
      </div>
      <GitHubLink />
      <ThemeToggle />
    </header>
  );
}

// Header for home page with no background, no title
export function HeaderHome() {
  return (
    <header className="absolute lg:fixed top-0 right-0 p-4 flex flex-row gap-4">
      <GitHubLink />
      <ThemeToggle />
    </header>
  );
}

function GitHubLink() {
  return (
    <a
      href="https://github.com/na-trium-144/wrapdb-browser"
      target="_blank"
      rel="noopener"
      className={clsx(
        "p-2 rounded-lg",
        "bg-base-1 dark:bg-base-1d",
        "text-content-2 dark:text-content-2d",
        "hover:bg-base-2 dark:hover:bg-base-2d",
        "z-50 cursor-pointer",
      )}
      aria-label="GitHub Repository of WrapDB Browser"
      title="GitHub Repository of WrapDB Browser"
    >
      <GithubIcon />
    </a>
  );
}
