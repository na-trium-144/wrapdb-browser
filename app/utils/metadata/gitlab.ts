import {
  findUpstreamVersion,
  type PackageMetadata,
  type RepoType,
} from "../metadata";

export async function fetchMetadataGitLab(
  source: {
    host: string;
    repoType: RepoType;
    repoOwner: string;
    repoName: string;
    currentTagName: string;
  },
  wrapLatestVersion: string,
): Promise<PackageMetadata> {
  const repoId = encodeURIComponent(`${source.repoOwner}/${source.repoName}`);
  const res = await fetch(`https://${source.host}/api/v4/projects/${repoId}`, {
    headers: {
      // GNOME GitLab does not allow fetch without user-agent?
      "User-Agent": "wrapdb-browser",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch metadata: ${res.statusText}`);
  }
  const resBody = await res.text();
  let data: any;
  try {
    data = JSON.parse(resBody);
  } catch {
    throw new Error(`Failed to parse metadata. Original response: ${resBody}`);
  }

  const { upstreamVersion, isOutdated } = await findUpstreamVersion(
    source.currentTagName,
    wrapLatestVersion,
    async (page) => {
      const res = await fetch(
        `https://${source.host}/api/v4/projects/${repoId}/repository/tags?per_page=100&page=${page}`,
        {
          headers: {
            "User-Agent": "wrapdb-browser",
          },
        },
      );
      if (!res.ok) {
        throw new Error(`Failed to fetch tags: ${res.statusText}`);
      }
      const resBody = await res.text();
      let tagsData: { name: string }[];
      try {
        tagsData = JSON.parse(resBody);
      } catch {
        throw new Error(`Failed to parse tags. Original response: ${resBody}`);
      }
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
    license: data.license?.key,
    upstreamVersion,
    isOutdated,
    repo: {
      type: source.repoType,
      owner: source.repoOwner,
      name: source.repoName,
    },
  };
}
