import type {
  DiagnosticReport,
  Severity,
  ShellInfo,
} from "../../../shared/contracts";

type EnvironmentMatrixProps = { report: DiagnosticReport };

const trackedTools = ["git", "node", "python", "codex"] as const;

const toolVersion = (shell: ShellInfo | undefined): string => {
  if (shell?.available !== true) return "Non détecté";
  return shell.version ?? "Version inconnue";
};

const environmentSeverity = (
  report: DiagnosticReport,
  toolId: string,
  distributionName: string,
): Severity | null => {
  const slug = distributionName
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/(^-|-$)/gu, "");
  return (
    report.issues.find(
      (issue) => issue.id === `environment-versions-${toolId}-${slug}`,
    )?.severity ?? null
  );
};

const severityLabel: Record<Severity, string> = {
  critical: "Critique",
  warning: "Attention",
  info: "Info",
};

export const EnvironmentMatrix = ({ report }: EnvironmentMatrixProps) => {
  const distributions = report.snapshot.wslDistributions.filter(
    (distribution) => !distribution.managed,
  );
  const managed = report.snapshot.wslDistributions.filter(
    (distribution) => distribution.managed,
  );

  return (
    <section className="environment-card" id="shells">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ENVIRONNEMENTS</p>
          <h2>Windows et WSL</h2>
        </div>
        <span>
          {distributions.length} distribution
          {distributions.length === 1 ? "" : "s"} analysée
          {distributions.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="environment-table-wrap">
        <table className="environment-table">
          <thead>
            <tr>
              <th>Outil</th>
              <th>Windows</th>
              {distributions.map((distribution) => (
                <th key={distribution.name}>{distribution.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trackedTools.map((toolId) => (
              <tr key={toolId}>
                <th>{toolId === "python" ? "Python" : toolId}</th>
                <td>
                  {toolVersion(
                    report.snapshot.shells.find((shell) => shell.id === toolId),
                  )}
                </td>
                {distributions.map((distribution) => {
                  const severity = environmentSeverity(
                    report,
                    toolId,
                    distribution.name,
                  );
                  return (
                    <td
                      className={
                        severity === null
                          ? undefined
                          : `version-conflict ${severity}`
                      }
                      key={distribution.name}
                    >
                      {toolVersion(
                        distribution.shells.find(
                          (shell) => shell.id === toolId,
                        ),
                      )}
                      {severity !== null && (
                        <strong className={`conflict-label ${severity}`}>
                          {severityLabel[severity]}
                        </strong>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {managed.length > 0 && (
        <p className="managed-note">
          {managed.map((distribution) => distribution.name).join(", ")} est géré
          par une application et exclu des comparaisons de versions.
        </p>
      )}
    </section>
  );
};
