import { Info20Filled, Warning20Filled } from "@fluentui/react-icons";
import type { Issue, Severity } from "../../../shared/contracts";

type Props = {
  readonly issues: readonly Issue[];
  readonly selectedId: string | null;
  readonly onSelect: (issue: Issue) => void;
};

const label: Record<Severity, string> = {
  critical: "Critique",
  warning: "Attention",
  info: "Info",
};

export const IssueList = ({ issues, selectedId, onSelect }: Props) => (
  <section className="issues-panel" aria-labelledby="issues-title">
    <div className="panel-heading">
      <h2 id="issues-title">Problèmes détectés</h2>
      <span>{issues.length} au total</span>
    </div>
    <p className="severity-policy">
      <strong>Critique</strong> = résultat ou workflow affecté ·{" "}
      <strong>Attention</strong> = risque sans impact confirmé
    </p>
    <fieldset className="filter-row">
      <legend className="sr-only">Filtres</legend>
      <button className="filter active" type="button">
        Tous {issues.length}
      </button>
      <span className="legend error">
        Critiques {issues.filter((i) => i.severity === "critical").length}
      </span>
      <span className="legend warning">
        Attention {issues.filter((i) => i.severity === "warning").length}
      </span>
    </fieldset>
    <div className="issue-list">
      {issues.length === 0 ? (
        <div className="empty">Aucun problème détecté.</div>
      ) : (
        issues.map((issue) => (
          <button
            className={`issue-row ${selectedId === issue.id ? "selected" : ""}`}
            key={issue.id}
            type="button"
            onClick={() => onSelect(issue)}
          >
            <span className={`severity-icon ${issue.severity}`}>
              {issue.severity === "info" ? (
                <Info20Filled />
              ) : (
                <Warning20Filled />
              )}
            </span>
            <span className="issue-copy">
              <strong>{issue.title}</strong>
              <span className="mono">{issue.evidence}</span>
            </span>
            <span className={`severity-label ${issue.severity}`}>
              {label[issue.severity]}
            </span>
          </button>
        ))
      )}
    </div>
  </section>
);
