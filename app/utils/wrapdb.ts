import * as INI from "ini";

// --- Types for API fetching ---
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

// --- API Functions (for on-demand fetching) ---
export async function fetchReleases(): Promise<{
  packages: WrapDbPackages;
  hash: string;
}> {
  const res = await fetch(
    "https://raw.githubusercontent.com/mesonbuild/wrapdb/master/releases.json",
  );
  if (!res.ok) throw new Error(`Failed to fetch releases: ${res.statusText}`);

  const content = await res.text();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(content),
  );
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const packages: WrapDbPackages = JSON.parse(content);
  for (const [name, pkg] of Object.entries(packages)) {
    if (!pkg.dependency_names?.length && !pkg.program_names?.length) {
      pkg.dependency_names = [name];
    }
    if (!pkg.dependency_names) {
      pkg.dependency_names = [];
    }
    if (!pkg.program_names) {
      pkg.program_names = [];
    }
  }
  return { packages, hash };
}

export async function fetchWrap(
  packageName: string,
  version: string,
): Promise<WrapFileData> {
  const res = await fetch(
    `https://github.com/mesonbuild/wrapdb/releases/download/${packageName}_${version}/${packageName}.wrap`,
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
  const res = await fetch(
    `https://github.com/mesonbuild/wrapdb/releases/download/${packageName}_${version}/${packageName}_${version}_patch.zip`,
    {
      cf: {
        cacheTtl: 31536000,
        cacheEverything: true,
      },
    },
  );
  if (!res.ok) throw new Error(`Failed to fetch patch: ${res.statusText}`);
  return res;
}
