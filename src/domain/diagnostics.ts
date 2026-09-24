import type {
  DiagnosticReport,
  Issue,
  PathEntry,
  SystemSnapshot,
} from "../shared/contracts";
import { inspectPath, normalizePath } from "./path-utils";
import { inspectShells } from "./shell-diagnostics";

const issueForEntry = (entry: PathEntry): Issue | null => {
  const suffix = `${entry.scope}-${entry.index}`;
  if (entry.raw.length === 0) {
    return {
      id: `empty-${suffix}`,
      severity: "warning",
      scope: entry.scope,
      title: "Entrée PATH vide",
      explanation:
        "Une entrée vide est inutile et peut produire des comportements différents selon l'outil.",
      evidence: `Position ${entry.index + 1}`,
      repairable: entry.scope === "user",
      entryIndex: entry.index,
    };
  }
  if (entry.duplicateOf !== null) {
    return {
      id: `duplicate-${suffix}`,
      severity: "warning",
      scope: entry.scope,
      title: "Dossier présent deux fois",
      explanation:
        "Les doublons allongent la recherche des commandes et rendent l'ordre plus difficile à comprendre.",
      evidence: `${entry.raw} · identique à l'entrée ${entry.duplicateOf + 1}`,
      repairable: entry.scope === "user",
      entryIndex: entry.index,
    };
  }
  if (!entry.exists) {
    return {
      id: `missing-${suffix}`,
      severity: "critical",
      scope: entry.scope,
      title: "Dossier introuvable",
      explanation:
        "Ce dossier n'existe plus. Les commandes qui en dépendent ne peuvent pas démarrer.",
      evidence: entry.raw,
      repairable: entry.scope === "user",
      entryIndex: entry.index,
    };
  }
  if (entry.raw.startsWith('"') || entry.raw.endsWith('"')) {
    return {
      id: `quoted-${suffix}`,
      severity: "info",
      scope: entry.scope,
      title: "Guillemets inutiles dans le PATH",
      explanation:
        "Windows accepte les chemins contenant des espaces sans guillemets dans la variable PATH.",
      evidence: entry.raw,
      repairable: entry.scope === "user",
      entryIndex: entry.index,
    };
  }
  return null;
};

const crossScopeDuplicates = (
  user: readonly PathEntry[],
  machine: readonly PathEntry[],
): readonly Issue[] => {
  const machineValues = new Set<string>();
  for (const entry of machine) {
    if (entry.normalized.length > 0) machineValues.add(entry.normalized);
  }
  return user.flatMap((entry) =>
    machineValues.has(normalizePath(entry.raw))
      ? [
          {
            id: `cross-${entry.index}`,
            severity: "info",
            scope: "user",
            title: "Déjà présent dans le PATH système",
            explanation:
              "Cette entrée utilisateur répète un dossier déjà fourni à tous les comptes Windows.",
            evidence: entry.raw,
            repairable: true,
            entryIndex: entry.index,
          },
        ]
      : [],
  );
};

export const analyzeSnapshot = async (
  snapshot: SystemSnapshot,
): Promise<DiagnosticReport> => {
  const [user, machine, process] = await Promise.all([
    inspectPath("user", snapshot.userPath),
    inspectPath("machine", snapshot.machinePath),
    inspectPath("process", snapshot.processPath),
  ]);
  const entries = [...user, ...machine, ...process];
  const pathIssues = [...user, ...machine].flatMap((entry) => {
    const issue = issueForEntry(entry);
    return issue === null ? [] : [issue];
  });
  const issues = [
    ...inspectShells(snapshot),
    ...pathIssues,
    ...crossScopeDuplicates(user, machine),
  ];
  const criticalCount = issues.filter(
    (issue) => issue.severity === "critical",
  ).length;
  const warningCount = issues.filter(
    (issue) => issue.severity === "warning",
  ).length;
  const penalty =
    Math.min(criticalCount * 18, 72) + Math.min(warningCount * 2, 24);
  return { snapshot, entries, issues, score: Math.max(0, 100 - penalty) };
};
