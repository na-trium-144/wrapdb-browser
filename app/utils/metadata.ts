export type PackageMetadata = {
  description?: string;
  homepage?: string;
  repo?: GitHubRepository;
  license?: string;
  upstreamVersion?: string;
};

export type GitHubRepository = {
  type: "github";
  owner: string;
  name: string;
};

export async function fetchMetadata(
  sourceUrl: string,
  wrapLatestVersion: string,
) {
  if (sourceUrl.startsWith("https://github.com")) {
    const repoOwner = sourceUrl.split("/")[3];
    const repoName = sourceUrl.split("/")[4].replace(/\.git$/, "");

    const res = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}`,
      {
        headers: {
          "User-Agent": "wrapdb-browser",
        },
      },
    );
    if (!res.ok) throw new Error(`Failed to fetch metadata: ${res.statusText}`);
    const data = (await res.json()) as any;

    const tagsRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/tags?per_page=100`,
      {
        headers: {
          "User-Agent": "wrapdb-browser",
        },
      },
    );
    if (!tagsRes.ok)
      throw new Error(`Failed to fetch tags: ${tagsRes.statusText}`);
    const tagsData = (await tagsRes.json()) as any[];

    let upstreamVersion: string | undefined = undefined;
    if (
      tagsData.find(
        (tag) =>
          tag.name === wrapLatestVersion.split("-")[0] ||
          tag.name === `v${wrapLatestVersion.split("-")[0]}`,
      )
    ) {
      // if the version scheme seems to match, get the latest version tag
      upstreamVersion = tagsData[0].name.replace(/^v/, "");
    }

    return {
      description: data.description,
      homepage: data.homepage,
      license: data.license?.spdx_id,
      upstreamVersion,
      repo: {
        type: "github",
        owner: repoOwner,
        name: repoName,
      },
    } as PackageMetadata;
  } else {
    return {};
  }
}
