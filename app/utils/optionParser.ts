import { z } from "zod";

// https://mesonbuild.com/Build-options.html
const MesonValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
]);
export type MesonValue = z.infer<typeof MesonValueSchema>;

const MesonOptionSchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  value: z.union([MesonValueSchema, z.array(MesonValueSchema)]).optional(),
  choices: z.array(MesonValueSchema).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  deprecated: z
    .union([
      z.boolean(),
      z.string(),
      z.array(MesonValueSchema),
      z.record(z.string(), MesonValueSchema),
    ])
    .optional(),
  yield: z.boolean().optional(),
});
export type MesonOption = z.infer<typeof MesonOptionSchema>;

function splitByTopLevelSeparator(text: string, separator: string): string[] {
  if (!text.trim()) return [];
  const parts: string[] = [];
  let startIndex = 0;
  let parenBalance = 0;
  let braceBalance = 0;
  let bracketBalance = 0;
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === "\\") i++;
      else if (char === "'") inQuotes = false;
    } else {
      if (char === "'") inQuotes = true;
      else if (char === "(") parenBalance++;
      else if (char === ")") parenBalance--;
      else if (char === "[") bracketBalance++;
      else if (char === "]") bracketBalance--;
      else if (char === "{") braceBalance++;
      else if (char === "}") braceBalance--;
      else if (
        char === separator &&
        parenBalance === 0 &&
        bracketBalance === 0 &&
        braceBalance === 0
      ) {
        parts.push(text.substring(startIndex, i));
        startIndex = i + 1;
      }
    }
  }
  parts.push(text.substring(startIndex));
  return parts.map((p) => p.trim());
}

export function parseMesonValue(value: string): any {
  const trimmedValue = value.trim();

  if (trimmedValue.includes("+")) {
    const parts = splitByTopLevelSeparator(trimmedValue, "+");
    if (
      parts.every((p) => p.trim().startsWith("'") && p.trim().endsWith("'"))
    ) {
      return parts.map((p) => parseMesonValue(p)).join("");
    }
  }

  if (trimmedValue === "true") return true;
  if (trimmedValue === "false") return false;

  if (/^[-+]?[0-9]+$/.test(trimmedValue)) {
    return parseInt(trimmedValue, 10);
  }
  if (/^[-+]?([0-9]*\.[0-9]+|[0-9]+\.[0-9]*)$/.test(trimmedValue)) {
    return parseFloat(trimmedValue);
  }

  if (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")) {
    return trimmedValue
      .slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, "\\");
  }

  if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
    const content = trimmedValue.slice(1, -1);
    return splitByTopLevelSeparator(content, ",").map((item) =>
      parseMesonValue(item),
    );
  }

  if (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) {
    const content = trimmedValue.slice(1, -1);
    const result: Record<string, any> = {};
    const pairs = splitByTopLevelSeparator(content, ",");
    for (const pair of pairs) {
      const pairParts = splitByTopLevelSeparator(pair, ":");
      if (pairParts.length === 2) {
        const parsedKey = parseMesonValue(pairParts[0]);
        if (typeof parsedKey === "string") {
          result[parsedKey] = parseMesonValue(pairParts[1]);
        }
      }
    }
    return result;
  }

  return trimmedValue;
}

/**
 * Parses Meson option() definitions from a string.
 * This parser is designed to be simple and robust, handling nested brackets and string literals with escapes.
 * It does not evaluate expressions or remove quotes from strings.
 *
 * @param content The string content to parse, likely from a meson_options.txt file.
 * @returns An array of objects, where each object represents an option and its raw arguments.
 */
export function parseMesonOptions(content: string): Array<MesonOption> {
  // 1. Remove comments and normalize newlines to spaces.
  const processedContent = content
    .split("\n")
    .map((line) => {
      const commentIndex = line.indexOf("#");
      return commentIndex !== -1 ? line.substring(0, commentIndex) : line;
    })
    .join(" ");

  const results: Array<MesonOption> = [];
  const optionPrefix = "option(";
  let currentIndex = 0;

  // Find all 'option(' occurrences.
  while (
    (currentIndex = processedContent.indexOf(optionPrefix, currentIndex)) !== -1
  ) {
    const startIndex = currentIndex + optionPrefix.length;
    let balance = 1;
    let endIndex = -1;
    let inQuotes = false;

    // Find the matching closing parenthesis for 'option(', respecting quotes and escapes.
    for (let i = startIndex; i < processedContent.length; i++) {
      const char = processedContent[i];
      if (inQuotes) {
        if (char === "\\") {
          i++; // Skip escaped character
        } else if (char === "'") {
          inQuotes = false;
        }
      } else {
        if (char === "'") {
          inQuotes = true;
        } else if (char === "(") {
          balance++;
        } else if (char === ")") {
          balance--;
          if (balance === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }

    if (endIndex === -1) {
      // No matching parenthesis found, stop parsing.
      break;
    }

    const argsString = processedContent.substring(startIndex, endIndex);
    const rawArgs = splitByTopLevelSeparator(argsString, ",");
    const parsedArgs: Record<string, any> = {};

    if (rawArgs.length > 0 && rawArgs[0]) {
      parsedArgs["name"] = parseMesonValue(rawArgs[0]);
    }

    for (let i = 1; i < rawArgs.length; i++) {
      const argParts = splitByTopLevelSeparator(rawArgs[i], ":");
      if (argParts.length === 2) {
        const key = argParts[0];
        const value = argParts[1];
        parsedArgs[key] = parseMesonValue(value);
      }
    }

    const validationResult = MesonOptionSchema.safeParse(parsedArgs);
    if (validationResult.success) {
      results.push(validationResult.data);
    }

    // Continue searching from the end of the current option block.
    currentIndex = endIndex;
  }

  return results;
}
