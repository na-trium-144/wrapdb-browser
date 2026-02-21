import {
  findUpstreamVersion,
  type PackageMetadata,
  type RepoType,
} from "../metadata";

/*
gitlab.gnome.orgはCloudflareWorkerへのアクセスをブロックしているので、
別で建てたプロキシサーバーを経由してアクセスする。
env.GNOME_PROXY_ORIGINとenv.GNOME_PROXY_SECRETが未設定の開発環境では普通にアクセスする。
*/
function fetchWithProxy(url: string, env: Env) {
  if (url.includes("gitlab.gnome.org") && "GNOME_PROXY_ORIGIN" in env) {
    const originalUrl = new URL(url);
    const proxyUrl = new URL(
      originalUrl.pathname + originalUrl.search,
      (env as any).GNOME_PROXY_ORIGIN,
    );
    return fetch(proxyUrl.toString(), {
      headers: {
        "X-Proxy-Secret": (env as any).GNOME_PROXY_SECRET,
        // GNOME GitLab does not allow fetch without user-agent?
        "User-Agent": "wrapdb-browser",
      },
    });
  } else {
    return fetch(url, {
      headers: {
        "User-Agent": "wrapdb-browser",
      },
    });
  }
}
export async function fetchMetadataGitLab(
  source: {
    host: string;
    repoType: RepoType;
    repoOwner: string;
    repoName: string;
    currentTagName: string;
  },
  wrapLatestVersion: string,
  env: Env,
): Promise<PackageMetadata> {
  const repoId = encodeURIComponent(`${source.repoOwner}/${source.repoName}`);
  const res = await fetchWithProxy(
    `https://${source.host}/api/v4/projects/${repoId}`,
    env,
  );
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
      const res = await fetchWithProxy(
        `https://${source.host}/api/v4/projects/${repoId}/repository/tags?per_page=100&page=${page}`,
        env,
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
