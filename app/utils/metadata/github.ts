import { findUpstreamVersion, type PackageMetadata } from "../metadata";

export async function fetchMetadataGitHub(
  sourceUrl: string,
  wrapLatestVersion: string,
  env: any,
): Promise<PackageMetadata> {
  const repoOwner = sourceUrl.split("/")[3];
  const repoName = sourceUrl.split("/")[4].replace(/\.git$/, "");
  const githubAPIHeaders = {
    "User-Agent": "wrapdb-browser",
    ...(env.GITHUB_PAT ? { Authorization: `Bearer ${env.GITHUB_PAT}` } : {}),
  };
  const res = await fetch(
    `https://api.github.com/repos/${repoOwner}/${repoName}`,
    {
      headers: githubAPIHeaders,
    },
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch metadata: ${res.statusText}`);
  }
  const data = (await res.json()) as any;

  let currentTagName: string | undefined = undefined;
  if (sourceUrl.split("/")[7] === "tags") {
    // owner/repo/archive/refs/tags/v1.2.3.zip
    currentTagName = sourceUrl.split("/")[8].replace(/\.zip$|\.tar.*$/, "");
  } else if (sourceUrl.split("/")[5] === "releases") {
    // owner/repo/releases/download/v1.2.3/source.zip
    currentTagName = sourceUrl.split("/")[7];
  } else if (sourceUrl.split("/")[5] === "archive") {
    // owner/repo/archive/v1.2.3.zip
    currentTagName = sourceUrl.split("/")[6].replace(/\.zip$|\.tar.*$/, "");
  } else if (sourceUrl.split("/")[5] === "tar.gz") {
    // codeload.github.com/owner/repo/tar.gz/v1.2.3
    currentTagName = sourceUrl.split("/")[6];
  } else {
    console.error(
      `Could not determine current tag name from the URL: ${sourceUrl}`,
    );
  }
  const { upstreamVersion, isOutdated } = await findUpstreamVersion(
    currentTagName,
    wrapLatestVersion,
    async (page) => {
      const res = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/tags?per_page=100&page=${page}`,
        {
          headers: githubAPIHeaders,
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch tags: ${res.statusText}`);
      }
      const tagsData = (await res.json()) as { name: string }[];
      const linkHeader = res.headers.get("Link");
      return {
        tags: tagsData.map((tag) => tag.name),
        hasNext: !!linkHeader && linkHeader.includes('rel="next"'),
      };
    },
  );

  return {
    description: data.description,
    homepage: data.homepage,
    license: data.license?.spdx_id,
    upstreamVersion,
    isOutdated,
    repo: {
      type: "github",
      owner: repoOwner,
      name: repoName,
    },
  };
}
