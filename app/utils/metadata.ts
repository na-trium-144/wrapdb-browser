import { fetchMetadataGitHub } from "./metadata/github";

export type PackageMetadata = {
  description?: string;
  homepage?: string;
  repo?: GitHubRepository;
  license?: string;
  upstreamVersion?: string;  // latest upstream version detected from the source repo
  isOutdated?: boolean; // whether the wrap is outdated compared to the upstream version
};

export type GitHubRepository = {
  type: "github";
  owner: string;
  name: string;
};

export async function fetchMetadata(
  sourceUrl: string,
  wrapLatestVersion: string,
  env: any,
): Promise<PackageMetadata> {
  // the version number of wrap is `<package version>-<wrap revision>`.
  // so remove the suffix here.
  wrapLatestVersion = wrapLatestVersion.split("-")[0];

  if (sourceUrl.startsWith("https://github.com")) {
    return fetchMetadataGitHub(sourceUrl, wrapLatestVersion, env);
  } else {
    return {};
  }
}
