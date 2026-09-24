import { access } from "node:fs/promises";
import { normalize, resolve } from "node:path";
import type { PathEntry, PathScope } from "../shared/contracts";

const trimEntry = (value: string): string => value.trim().replace(/^"|"$/g, "");

export const splitPath = (value: string): readonly string[] =>
  value.split(";").map(trimEntry);

export const normalizePath = (value: string): string => {
  const trimmed = trimEntry(value).replaceAll("/", "\\");
  if (trimmed.length === 0) return "";
  return normalize(resolve(trimmed)).replace(/\\+$/, "").toLowerCase();
};

const pathExists = async (value: string): Promise<boolean> => {
  if (value.length === 0) return false;
  try {
    await access(value);
    return true;
  } catch {
    return false;
  }
};

export const inspectPath = async (
  scope: PathScope,
  value: string,
): Promise<readonly PathEntry[]> => {
  const seen = new Map<string, number>();
  return Promise.all(
    splitPath(value).map(async (raw, index) => {
      const normalized = normalizePath(raw);
      const duplicateOf =
        normalized.length > 0 ? (seen.get(normalized) ?? null) : null;
      if (normalized.length > 0 && duplicateOf === null)
        seen.set(normalized, index);
      return {
        scope,
        index,
        raw,
        normalized,
        exists: await pathExists(raw),
        duplicateOf,
      } satisfies PathEntry;
    }),
  );
};

export const repairedUserPath = (entries: readonly PathEntry[]): string =>
  entries
    .flatMap((entry) =>
      entry.scope === "user" &&
      entry.raw.length > 0 &&
      entry.exists &&
      entry.duplicateOf === null
        ? [entry.raw]
        : [],
    )
    .join(";");
