import type { WrapDbPackageData } from "./wrapdb";

// --- Scoring Logic ---
export function calculateScore(
  name: string,
  data: WrapDbPackageData,
  query: string,
): number {
  const n = name.toLowerCase();
  const q = query.toLowerCase();

  if (n === q) return 100; // Exact name match
  if (n.startsWith(q)) return 90; // Name starts with

  const exactDepMatch = (data.dependency_names || []).some(
    (dep) => dep.toLowerCase() === q,
  );
  const exactProgMatch = (data.program_names || []).some(
    (prog) => prog.toLowerCase() === q,
  );
  if (exactDepMatch || exactProgMatch) return 80; // Exact match in deps/progs

  if (n.includes(q)) return 70; // Name contains

  const depMatch = (data.dependency_names || []).some((dep) =>
    dep.toLowerCase().includes(q),
  );
  const progMatch = (data.program_names || []).some((prog) =>
    prog.toLowerCase().includes(q),
  );
  if (depMatch || progMatch) return 50; // Contains match in deps/progs

  return 0;
}
