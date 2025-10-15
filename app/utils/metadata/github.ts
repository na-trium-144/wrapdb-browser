import { fetchWithCache } from "../cache";
import type { PackageMetadata } from "../metadata";

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
  const res = await fetchWithCache(
    `https://api.github.com/repos/${repoOwner}/${repoName}`,
    "s-maxage=86400",
    (url) => fetch(url, { headers: githubAPIHeaders }),
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch metadata: ${res.statusText}`);
  }
  const data = (await res.json()) as any;

  // 現在のタグと同じprefixを持つ最初のタグを探す。
  // curl-8_16_0 のような例があるため、英数字以外をすべて . に置換して比較する。
  // alpha, beta などを含むタグは除外する (手動でパターンを指定している)
  let currentTagName: string | undefined = undefined;
  if (sourceUrl.split("/")[7] === "tags") {
    currentTagName = sourceUrl.split("/")[8].replace(/\.zip$|\.tar.*$/, "");
  } else if (sourceUrl.split("/")[5] === "releases") {
    currentTagName = sourceUrl.split("/")[7];
  } else if (sourceUrl.split("/")[5] === "archive") {
    currentTagName = sourceUrl.split("/")[6].replace(/\.zip$|\.tar.*$/, "");
  }
  let upstreamVersion: string | undefined = undefined;
  let isOutdated: boolean | undefined = undefined;
  if (
    currentTagName?.replaceAll(/[^a-zA-Z0-9]/g, ".").endsWith(wrapLatestVersion)
  ) {
    const lookupVersionPrefix = currentTagName
      .replaceAll(/[^a-zA-Z0-9]/g, ".")
      .split(wrapLatestVersion)[0];
    let tagAPIPage = 1;
    while (true) {
      const tagsRes = await fetchWithCache(
        `https://api.github.com/repos/${repoOwner}/${repoName}/tags?per_page=100&page=${tagAPIPage}`,
        "s-maxage=300",
        (url) => fetch(url, { headers: githubAPIHeaders }),
      );
      if (!tagsRes.ok) {
        throw new Error(`Failed to fetch tags: ${tagsRes.statusText}`);
      }
      const tagsData = (await tagsRes.json()) as { name: string }[];

      upstreamVersion = tagsData
        .map((tag) => tag.name)
        .filter((tag) => !/alpha|beta|rc|dev|test|snapshot/i.test(tag))
        .find((tag) =>
          new RegExp("^" + lookupVersionPrefix + "[0-9]+\\.+").test(
            tag.replaceAll(/[^a-zA-Z0-9]/g, "."),
          ),
        );
      if (upstreamVersion) {
        isOutdated =
          upstreamVersion.replaceAll(/[^a-zA-Z0-9]/g, ".") !==
          lookupVersionPrefix + wrapLatestVersion;
        break;
      }
      const linkHeader = tagsRes.headers.get("Link");
      if (linkHeader && linkHeader.includes('rel="next"')) {
        tagAPIPage += 1;
      } else {
        break;
      }
    }
  }

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
  } as PackageMetadata;
}
