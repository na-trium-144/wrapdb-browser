import { fetchMetadataGitHub } from "./metadata/github";
import { fetchMetadataGitLab } from "./metadata/gitlab";
import { semVerCompare } from "./semVer";

export type PackageMetadata = {
  description?: string;
  homepage?: string;
  repo?: {
    type: RepoType;
    owner: string;
    name: string;
  };
  license?: string;
  upstreamVersion?: string; // latest upstream version detected from the source repo
  isOutdated?: boolean; // whether the wrap is outdated compared to the upstream version
};
export type RepoType = "github" | "gitlab" | "gitlab-gnome";

export async function fetchMetadata(
  sourceUrl: string,
  wrapLatestVersion: string,
  env: any,
): Promise<PackageMetadata | undefined> {
  // the version number of wrap is `<package version>-<wrap revision>`.
  // so remove the suffix here.
  wrapLatestVersion = wrapLatestVersion.split("-")[0];

  // Add more source URL handlers (e.g., GitLab, etc.) or some custom logic for specific packages.
  // https://github.com/na-trium-144/wrapdb-browser/issues/12
  if (/^(codeload\.)?github\.com$/.test(new URL(sourceUrl).hostname)) {
    return fetchMetadataGitHub(sourceUrl, wrapLatestVersion, env);
  }
  if (/^gitlab\.com$|^gitlab\.gnome\.org/.test(new URL(sourceUrl).hostname)) {
    return fetchMetadataGitLab(
      {
        host: new URL(sourceUrl).hostname,
        repoType:
          new URL(sourceUrl).hostname === "gitlab.com"
            ? "gitlab"
            : "gitlab-gnome",
        repoOwner: sourceUrl.split("/")[3],
        repoName: sourceUrl.split("/")[4],
        // it seems it has only this pattern: owner/repo/-/archive/v1.2.3/repo-v1.2.3.zip
        currentTagName: sourceUrl.split("/")[7],
      },
      wrapLatestVersion,
      // env,
    );
  }
  if (/^download\.gnome\.org$/.test(new URL(sourceUrl).hostname)) {
    return fetchMetadataGitLab(
      {
        host: "gitlab.gnome.org",
        repoType: "gitlab-gnome",
        repoOwner: "GNOME",
        // https://download.gnome.org/sources/repo/1.2/repo-1.2.3.tar.xz
        repoName: sourceUrl.split("/")[4],
        currentTagName:
          /.*-([\d.]+)\.tar\.xz/.exec(sourceUrl.split("/")[6])?.[1] ?? "",
      },
      wrapLatestVersion,
      // env,
    );
  }

  return undefined;
}

/**
 * upstreamにあるタグのリストから、現在のタグと同じprefixを持つ最初のタグを探す。
 * curl-8_16_0 のような例があるため、英数字以外をすべて . に置換して比較する。
 * alpha, beta などを含むタグは除外する (手動でパターンを指定している)
 */
export async function findUpstreamVersion(
  currentTagName: string | undefined,
  wrapLatestVersion: string,
  // page starts from 1
  fetcher: (page: number) => Promise<{ tags: string[]; hasNext: boolean }>,
): Promise<{ upstreamVersion?: string; isOutdated?: boolean }> {
  if (
    !currentTagName
      ?.replaceAll(/[^a-zA-Z0-9]/g, ".")
      .includes(wrapLatestVersion)
  ) {
    return {};
  }
  const lookupVersionPrefix = currentTagName
    .replaceAll(/[^a-zA-Z0-9]/g, ".")
    .split(wrapLatestVersion)[0];
  for (let page = 1; ; page++) {
    const { tags, hasNext } = await fetcher(page);

    // find upstream tag that is same or newer than wrapLatestVersion
    const upstreamVersion = tags
      .filter((tag) => !/alpha|beta|rc|dev|test|snapshot/i.test(tag))
      .filter((tag) =>
        new RegExp("^" + lookupVersionPrefix + "[0-9]+").test(
          tag.replaceAll(/[^a-zA-Z0-9]/g, "."),
        ),
      )
      .filter((tag) => semVerCompare(tag, wrapLatestVersion) >= 0)
      .sort((a, b) => -semVerCompare(a, b))
      .at(0);
    if (upstreamVersion) {
      const isOutdated =
        upstreamVersion.replaceAll(/[^a-zA-Z0-9]/g, ".") !==
        lookupVersionPrefix + wrapLatestVersion;
      return { upstreamVersion, isOutdated };
    }
    if (!hasNext) {
      return {};
    }
  }
}
