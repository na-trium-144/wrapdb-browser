import * as INI from "ini";
import { fetchWithCache } from "./cache";

// --- Types ---
export type WrapDbPackageData = {
  dependency_names?: string[];
  program_names?: string[];
  versions: string[];
};

export type WrapDbPackages = {
  [packageName: string]: WrapDbPackageData;
};

export type WrapFileData = {
  sourceUrl: string;
  dependencyNames: string[];
  programNames: string[];
  hasPatchUrl: boolean;
};

// --- API Functions ---
export async function fetchReleases(): Promise<WrapDbPackages> {
  const res = await fetchWithCache(
    "https://wrapdb.mesonbuild.com/v2/releases.json",
  );
  if (!res.ok) throw new Error(`Failed to fetch releases: ${res.statusText}`);
  return await res.json();
}

export async function fetchWrap(
  packageName: string,
  version: string,
): Promise<WrapFileData> {
  const res = await fetchWithCache(
    `https://wrapdb.mesonbuild.com/v2/${packageName}_${version}/${packageName}.wrap`,
  );
  if (!res.ok) throw new Error(`Failed to fetch wrap file: ${res.statusText}`);
  const wrapIni = INI.parse(await res.text());
  const sourceUrl = wrapIni["wrap-file"]?.source_url;
  const patchUrl = wrapIni["wrap-file"]?.patch_url;
  const hasPatchUrl =
    patchUrl ===
    `https://wrapdb.mesonbuild.com/v2/${packageName}_${version}/get_patch`;
  if (!hasPatchUrl && patchUrl) {
    console.warn(
      `Warning: Detected non-standard patch_url in ${packageName} ${version}: ${patchUrl}`,
    );
  }
  let dependencyNames: string[] = [];
  let programNames: string[] = [];
  for (const [key, value] of Object.entries(wrapIni["provide"] || {})) {
    if (key === "dependency_names") {
      dependencyNames = (value as string).split(",").map((s) => s.trim());
    } else if (key === "program_names") {
      programNames = (value as string).split(",").map((s) => s.trim());
    } else {
      dependencyNames.push(key);
    }
  }
  if (!dependencyNames.length && !programNames.length) {
    dependencyNames = [packageName];
  }
  return { sourceUrl, dependencyNames, programNames, hasPatchUrl };
}

export async function fetchPatch(
  packageName: string,
  version: string,
): Promise<Response> {
  const res = await fetchWithCache(
    `https://wrapdb.mesonbuild.com/v2/${packageName}_${version}/get_patch`,
  );
  if (!res.ok) throw new Error(`Failed to fetch patch: ${res.statusText}`);
  return res;
}
