import { fetchMetadataGitHub } from "./metadata/github";

export type PackageMetadata = {
  description?: string;
  homepage?: string;
  repo?: {
    type: "github";
    owner: string;
    name: string;
  },
  license?: string;
  upstreamVersion?: string; // latest upstream version detected from the source repo
  isOutdated?: boolean; // whether the wrap is outdated compared to the upstream version
};

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
  if (/^(codeload\.)?github.com$/.test(new URL(sourceUrl).hostname)) {
    return fetchMetadataGitHub(sourceUrl, wrapLatestVersion, env);
  }

  return undefined;
}
