import { fetchMetadata } from "./metadata";
import { semVerCompare } from "./semVer";
import { fetchReleases, fetchWrap, type WrapFileData } from "./wrapdb";

// --- Types for D1 Database ---
export type PackageFromDB = {
  name: string;
  dependency_names: string; // JSON string
  program_names: string; // JSON string
  latest_version: string;
  description: string | null;
  homepage: string | null;
  repo_type: string | null;
  repo_owner: string | null;
  repo_name: string | null;
  latest_upstream_version: string | null;
  is_outdated: number | null; // 0 or 1
  updated_at: number | null;
};

export type VersionFromDB = {
  id: number;
  package_name: string;
  version: string;
  source_url: string | null;
  has_patch_url: number | null; // 0 or 1
  dependency_names: string; // JSON string
  program_names: string; // JSON string
};

// --- D1 Database Functions ---

export async function searchPackagesFromDB(db: D1Database, query: string) {
  const likeQuery = `%${query}%`;
  const resultsStmt = db.prepare(
    `SELECT * FROM packages WHERE name LIKE ?1 OR description LIKE ?1 OR dependency_names LIKE ?1 OR program_names LIKE ?1`,
  );

  const { results } = await resultsStmt.bind(likeQuery).all<PackageFromDB>();

  return results;
}

export async function getOrUpdatePackageInDB(
  db: D1Database,
  name: string,
  env: any,
  // pass packageData to avoid redundant fetch if you already obtained from searchPackagesFromDB
  packageData: PackageFromDB | null,
): Promise<PackageFromDB | null> {
  if (!packageData) {
    packageData = await db
      .prepare("SELECT * FROM packages WHERE name = ?1")
      .bind(name)
      .first<PackageFromDB>();
  }

  // On-demand fetch for package metadata (GitHub, etc.)
  if (!packageData) {
    return null;
  }

  const METADATA_STALE_AFTER_SECONDS = 86400; // 1 day
  const isMetadataStale =
    packageData.updated_at === null ||
    Date.now() / 1000 - packageData.updated_at > METADATA_STALE_AFTER_SECONDS;

  if (isMetadataStale) {
    try {
      console.log(`Fetching metadata for ${name}`);
      const latestVersionData = await getOrUpdateVersionInDB(
        db,
        name,
        packageData.latest_version,
      );
      if (!latestVersionData) {
        // should not happen
        console.error(
          `Latest version ${packageData.latest_version} of package ${name} not found in DB`,
        );
        return packageData;
      }

      // Metadata fetching depends on the source_url of the *latest* version
      let latestVersionWrapUrl = latestVersionData.source_url;

      if (latestVersionWrapUrl == null) {
        // should not happen
        console.error(
          `Latest version ${latestVersionData.version} of package ${name} has no source_url`,
        );
        return packageData;
      }

      const metadata = await fetchMetadata(
        latestVersionWrapUrl,
        packageData.latest_version,
        env,
      );
      if (metadata) {
        const stmt = db.prepare(
          `UPDATE packages SET description = ?1, homepage = ?2, repo_type = ?3, repo_owner = ?4, repo_name = ?5, latest_upstream_version = ?6, is_outdated = ?7, updated_at = ?8 WHERE name = ?9`,
        );
        await stmt
          .bind(
            metadata.description ?? null,
            metadata.homepage ?? null,
            metadata.repo?.type ?? null,
            metadata.repo?.owner ?? null,
            metadata.repo?.name ?? null,
            metadata.upstreamVersion ?? null,
            metadata.isOutdated === true
              ? 1
              : metadata.isOutdated === false
                ? 0
                : null,
            Math.floor(Date.now() / 1000),
            name,
          )
          .run();
        // Merge fetched data for immediate use
        return {
          ...packageData,
          description: metadata.description ?? null,
          homepage: metadata.homepage ?? null,
          repo_type: metadata.repo?.type ?? null,
          repo_owner: metadata.repo?.owner ?? null,
          repo_name: metadata.repo?.name ?? null,
          latest_upstream_version: metadata.upstreamVersion ?? null,
          is_outdated:
            metadata.isOutdated !== undefined
              ? metadata.isOutdated
                ? 1
                : 0
              : null,
          updated_at: Math.floor(Date.now() / 1000),
        } satisfies PackageFromDB;
      }
    } catch (e) {
      console.error(
        `Failed to fetch metadata for ${name}: ${(e as Error).message}`,
      );
    }
  }
  return packageData;
}

export async function getVersionsForPackageFromDB(
  db: D1Database,
  name: string,
): Promise<VersionFromDB[]> {
  const { results } = await db
    .prepare("SELECT * FROM versions WHERE package_name = ?1")
    .bind(name)
    .all<VersionFromDB>();
  return results.sort((a, b) => -semVerCompare(a.version, b.version));
}

export async function getOrUpdateVersionInDB(
  db: D1Database,
  packageName: string,
  version: string,
): Promise<VersionFromDB | null> {
  const versionData = await db
    .prepare("SELECT * FROM versions WHERE package_name = ?1 AND version = ?2")
    .bind(packageName, version)
    .first<VersionFromDB>();

  // On-demand fetch for version details (.wrap file)
  if (!versionData) {
    return null;
  }
  if (versionData.source_url === null) {
    try {
      console.log(`Fetching .wrap file for ${packageName}@${version}`);
      const wrapFileData = await fetchWrap(packageName, version);
      const stmt = db.prepare(
        `UPDATE versions SET source_url = ?1, has_patch_url = ?2, dependency_names = ?3, program_names = ?4 WHERE package_name = ?5 AND version = ?6`,
      );
      await stmt
        .bind(
          wrapFileData.sourceUrl,
          wrapFileData.hasPatchUrl ? 1 : 0,
          JSON.stringify(wrapFileData.dependencyNames),
          JSON.stringify(wrapFileData.programNames),
          packageName,
          version,
        )
        .run();

      // Merge fetched data for immediate use
      return {
        ...versionData,
        source_url: wrapFileData.sourceUrl,
        has_patch_url: wrapFileData.hasPatchUrl ? 1 : 0,
        dependency_names: JSON.stringify(wrapFileData.dependencyNames),
        program_names: JSON.stringify(wrapFileData.programNames),
      } satisfies VersionFromDB;
    } catch (e) {
      console.error(
        `Failed to fetch .wrap file for ${packageName}@${version}: ${(e as Error).message}`,
      );
    }
  }
  return versionData;
}

export async function syncDatabase(db: D1Database, kv: KVNamespace) {
  try {
    console.log("Starting database sync from releases.json...");

    // 1. Fetch all packages from releases.json
    const { packages, hash } = await fetchReleases();

    // 2. Check if releases.json has changed
    const previousHash = await kv.get("releases_hash");
    if (hash === previousHash) {
      console.log("releases.json has not changed. Skipping database sync.");
      return {
        success: true,
        message: "Skipped. releases.json has not changed.",
      };
    }

    const packageCount = Object.keys(packages).length;
    console.log(`Found ${packageCount} packages.`);

    // 3. Prepare batch statements
    const packageInsertStmt = db.prepare(
      `INSERT OR IGNORE INTO packages (name, dependency_names, program_names, latest_version) VALUES (?1, ?2, ?3, ?4)`,
    );
    const versionInsertStmt = db.prepare(
      `INSERT OR IGNORE INTO versions (package_name, version) VALUES (?1, ?2)`,
    );

    const packageBindings: D1PreparedStatement[] = [];
    const versionBindings: D1PreparedStatement[] = [];
    let versionCount = 0;

    for (const name in packages) {
      const pkg = packages[name];
      const latestVersion = pkg.versions[0];
      if (!latestVersion) {
        console.warn(`Skipping ${name}: No versions found.`);
        continue;
      }

      packageBindings.push(
        packageInsertStmt.bind(
          name,
          JSON.stringify(pkg.dependency_names),
          JSON.stringify(pkg.program_names),
          latestVersion,
        ),
      );

      for (const version of pkg.versions) {
        versionBindings.push(versionInsertStmt.bind(name, version));
        versionCount++;
      }
    }

    console.log(`Prepared ${packageBindings.length} packages for insertion.`);
    console.log(`Prepared ${versionBindings.length} versions for insertion.`);

    // 4. Execute batch operations
    await db.batch(packageBindings);
    console.log("Successfully inserted packages.");

    await db.batch(versionBindings);
    console.log("Successfully inserted versions.");

    // 5. Store the new hash in KV
    await kv.put("releases_hash", hash);

    return {
      success: true,
      message: `Sync complete. Processed ${packageCount} packages and ${versionCount} versions.`,
    };
  } catch (error: any) {
    console.error("An error occurred during database sync:", error);
    return {
      success: false,
      message: "Database sync failed.",
      error: error.message,
    };
  }
}
