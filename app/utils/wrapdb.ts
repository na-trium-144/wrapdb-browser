// --- Types ---
export type WrapDbPackageData = {
  dependency_names?: string[];
  program_names?: string[];
  versions: string[];
};

export type WrapDbPackages = {
  [packageName: string]: WrapDbPackageData;
};

// --- API Functions ---
export async function fetchReleases(): Promise<WrapDbPackages> {
  const res = await fetch("https://wrapdb.mesonbuild.com/v2/releases.json");
  if (!res.ok) throw new Error(`Failed to fetch releases: ${res.statusText}`);
  return await res.json();
}
