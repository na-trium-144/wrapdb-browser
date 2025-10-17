-- migrations/0000_create_tables.sql

DROP TABLE IF EXISTS versions;
DROP TABLE IF EXISTS packages;

CREATE TABLE packages (
  -- from release.json
  name TEXT PRIMARY KEY,
  dependency_names TEXT,
  program_names TEXT,
  latest_version TEXT,
  -- from repo info
  description TEXT,
  homepage TEXT,
  repo_type TEXT,
  repo_owner TEXT,
  repo_name TEXT,
  latest_upstream_version TEXT,
  is_outdated INTEGER,
  updated_at INTEGER
);

CREATE TABLE versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_name TEXT NOT NULL,
  version TEXT NOT NULL,
  source_url TEXT,
  has_patch_url INTEGER,
  dependency_names TEXT,
  program_names TEXT,
  FOREIGN KEY (package_name) REFERENCES packages(name) ON DELETE CASCADE,
  UNIQUE (package_name, version)
);

CREATE INDEX idx_versions_package_name ON versions (package_name);
