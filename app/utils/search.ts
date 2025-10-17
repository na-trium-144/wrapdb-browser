import type { PackageFromDB } from "./d1";

// --- Scoring Logic ---
export function calculateScore(data: PackageFromDB, query: string): number {
  const n = data.name.toLowerCase();
  const q = query.toLowerCase();

  if (n === q) return 100; // Exact name match

  const exactDepMatch = (JSON.parse(data.dependency_names) as string[]).some(
    (dep) => dep.toLowerCase() === q,
  );
  const exactProgMatch = (JSON.parse(data.program_names) as string[]).some(
    (prog) => prog.toLowerCase() === q,
  );
  if (exactDepMatch || exactProgMatch) return 90; // Exact match in deps/progs

  if (n.startsWith(q)) return 80; // Name starts with

  if (n.includes(q)) return 70; // Name contains

  const depMatch = (JSON.parse(data.dependency_names) as string[]).some((dep) =>
    dep.toLowerCase().includes(q),
  );
  const progMatch = (JSON.parse(data.program_names) as string[]).some((prog) =>
    prog.toLowerCase().includes(q),
  );
  if (depMatch || progMatch) return 50; // Contains match in deps/progs

  return 0;
}
