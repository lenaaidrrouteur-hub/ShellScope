import {
  CheckmarkCircle20Filled,
  DismissCircle20Filled,
  Info20Filled,
  Warning20Filled,
} from "@fluentui/react-icons";
import type { DiagnosticReport } from "../../../shared/contracts";

type Props = { readonly report: DiagnosticReport };

const coreShellIds = new Set([
  "pwsh",
  "powershell",
  "cmd",
  "git",
  "wsl",
  "codex",
]);

export const StatusCards = ({ report }: Props) => {
  const userCount = report.entries.filter(
    (entry) => entry.scope === "user",
  ).length;
  const machineCount = report.entries.filter(
    (entry) => entry.scope === "machine",
  ).length;
  const pathCards = [
    {
      id: "user-path",
      name: "PATH utilisateur",
      available: true,
      optional: false,
      critical: false,
      warning: false,
      multiple: false,
      detail: `${userCount} entrées`,
    },
    {
      id: "machine-path",
      name: "PATH système",
      available: true,
      optional: false,
      critical: false,
      warning: false,
      multiple: false,
      detail: `${machineCount} entrées`,
    },
  ];
  const cards = [
    ...pathCards,
    ...report.snapshot.shells.map((shell) => {
      const windowsIssueIds = new Set([
        `shell-${shell.id}`,
        `shell-versions-${shell.id}`,
        `shell-unverified-${shell.id}`,
        `shell-launchers-${shell.id}`,
      ]);
      const issue = report.issues.find((candidate) =>
        windowsIssueIds.has(candidate.id),
      );
      const hasMultipleLaunchers = shell.candidates.length > 1;
      const shortVersion = shell.version?.split(/\s/u)[0] ?? null;
      const optional = !shell.available && !coreShellIds.has(shell.id);
      return {
        id: shell.id,
        name: shell.name,
        available: shell.available,
        optional,
        critical: issue?.severity === "critical",
        warning: issue?.severity === "warning",
        multiple: hasMultipleLaunchers,
        detail: optional
          ? "Non installé; aucun projet ne l’exige"
          : shell.available
            ? `${shell.candidates.length} lanceur${shell.candidates.length > 1 ? "s" : ""} · actif ${shortVersion ?? "inconnu"}`
            : "Introuvable",
      };
    }),
  ];
  return (
    <section className="status-grid" aria-label="État des composants">
      {cards.map((card) => (
        <article className="status-card" key={card.id}>
          <div className="status-card-title">
            <span className="tool-icon">{card.name.slice(0, 2)}</span>
            <strong>{card.name}</strong>
          </div>
          <div
            className={`status ${card.critical ? "critical" : card.warning ? "warning" : card.optional || card.multiple ? "multiple" : card.available ? "ok" : "missing"}`}
          >
            {card.critical || card.warning ? (
              <Warning20Filled />
            ) : card.optional || card.multiple ? (
              <Info20Filled />
            ) : card.available ? (
              <CheckmarkCircle20Filled />
            ) : (
              <DismissCircle20Filled />
            )}
            {card.critical
              ? "Critique"
              : card.warning
                ? "Attention"
                : card.optional
                  ? "Optionnel"
                  : card.multiple
                    ? "Plusieurs lanceurs"
                    : card.available
                      ? "Détecté"
                      : "Absent"}
          </div>
          <span className="mono subtle">{card.detail}</span>
        </article>
      ))}
    </section>
  );
};
