/**
 * Compares two semantic version strings.
 * Returns:
 * - A negative number if v1 < v2
 * - Zero if v1 == v2
 * - A positive number if v1 > v2
 */
export function semVerCompare(v1: string, v2: string): number {
  const maxPartLength = Math.max(
    ...v1.split(".").map((part) => part.length),
    ...v2.split(".").map((part) => part.length),
  );
  const value1 = v1
    .split(".")
    .reduce((str, part) => str + part.padStart(maxPartLength, "0"), "");
  const value2 = v2
    .split(".")
    .reduce((str, part) => str + part.padStart(maxPartLength, "0"), "");
  if (value1 < value2) {
    return -1;
  }
  if (value1 > value2) {
    return 1;
  }
  return 0;
}
