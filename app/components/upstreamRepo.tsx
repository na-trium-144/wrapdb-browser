import type { RepoType } from "~/utils/metadata";
import { GithubIcon, GitLabIcon, GnomeIcon } from "./icon";

export function DisplayUpstreamRepo({
  className,
  repoType,
  owner,
  name,
}: {
  className?: string;
  repoType: RepoType;
  owner: string;
  name: string;
}) {
  switch (repoType) {
    case "github":
      return (
        <a
          href={`https://github.com/${owner}/${name}`}
          target="_blank"
          rel="noopener"
          className={className}
        >
          <GithubIcon className="inline-block w-[1.25em] h-[1.25em] mr-[0.25em]" />
          <span>{owner}</span>
          <span className="mx-1">/</span>
          <span>{name}</span>
        </a>
      );
    case "gitlab":
      return (
        <a
          href={`https://gitlab.com/${owner}/${name}`}
          target="_blank"
          rel="noopener"
          className={className}
        >
          <GitLabIcon className="inline-block w-[1.25em] h-[1.25em] mr-[0.25em]" />
          <span>{owner}</span>
          <span className="mx-1">/</span>
          <span>{name}</span>
        </a>
      );
    case "gitlab-gnome":
      return (
        <a
          href={`https://gitlab.gnome.org/${owner}/${name}`}
          target="_blank"
          rel="noopener"
          className={className}
        >
          <GnomeIcon className="inline-block w-[1.25em] h-[1.25em]" />
          <span className="mr-1">/</span>
          <span>{name}</span>
        </a>
      );
    default:
      repoType satisfies never;
      console.error(`Unknown repo type: ${repoType}`);
  }
}
