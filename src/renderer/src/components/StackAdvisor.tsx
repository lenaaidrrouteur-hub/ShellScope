import {
  CheckmarkCircle20Filled,
  DismissCircle20Filled,
} from "@fluentui/react-icons";
import { useMemo, useState } from "react";
import {
  type ProjectGoal,
  ProjectGoalSchema,
  type ProjectPriority,
  ProjectPrioritySchema,
  type ProjectTarget,
  ProjectTargetSchema,
  recommendStack,
} from "../../../domain/stack-advisor";
import type { DiagnosticReport, ProjectKind } from "../../../shared/contracts";

type StackAdvisorProps = {
  readonly report: DiagnosticReport;
  readonly onUseRecommendation: (kind: ProjectKind) => void;
};

const goals = [
  { value: "simple-site", label: "Une page ou un petit site de présentation" },
  { value: "web-app", label: "Une application Web interactive" },
  { value: "api", label: "Une API ou un service Web" },
  { value: "automation", label: "Automatiser des fichiers ou des tâches" },
  { value: "data-ai", label: "Données, analyse ou intelligence artificielle" },
  { value: "windows-desktop", label: "Une application propre à Windows" },
  {
    value: "cross-platform-desktop",
    label: "Une application de bureau Windows, macOS et Linux",
  },
  { value: "mobile", label: "Une application Android ou iPhone" },
  { value: "cli", label: "Un outil à utiliser dans le terminal" },
  {
    value: "background-service",
    label: "Un service qui tourne en arrière-plan",
  },
] as const satisfies readonly {
  readonly value: ProjectGoal;
  readonly label: string;
}[];

const targets = [
  { value: "windows", label: "Sur ce PC Windows" },
  { value: "linux-cloud", label: "Sur Linux ou dans le nuage" },
  { value: "docker", label: "Dans un conteneur Docker" },
  { value: "cross-platform", label: "Sur plusieurs systèmes" },
] as const satisfies readonly {
  readonly value: ProjectTarget;
  readonly label: string;
}[];

const priorities = [
  { value: "simple", label: "Le plus simple à comprendre et maintenir" },
  { value: "portable", label: "Facile à distribuer sur plusieurs machines" },
  { value: "performance", label: "Performance et exécutable autonome" },
] as const satisfies readonly {
  readonly value: ProjectPriority;
  readonly label: string;
}[];

export const StackAdvisor = ({
  report,
  onUseRecommendation,
}: StackAdvisorProps) => {
  const [goal, setGoal] = useState<ProjectGoal>("simple-site");
  const [target, setTarget] = useState<ProjectTarget>("windows");
  const [priority, setPriority] = useState<ProjectPriority>("simple");
  const recommendation = useMemo(
    () => recommendStack({ goal, target, priority }, report.snapshot),
    [goal, priority, report.snapshot, target],
  );
  const missingTools = recommendation.requiredTools.filter(
    (tool) => !tool.available,
  );

  const prepare = (): void => {
    if (recommendation.projectKind === null) return;
    onUseRecommendation(recommendation.projectKind);
    document.getElementById("project")?.scrollIntoView({ block: "start" });
  };

  return (
    <section className="advisor-card stack-advisor" id="advisor">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ARCHITECTE DE DÉPART</p>
          <h2>Que construire et avec quels outils?</h2>
        </div>
        <span>Conseil fondé sur ce PC</span>
      </div>
      <p className="advisor-intro">
        Commencez par le résultat. ShellScope choisit ensuite la pile la plus
        simple, le bon environnement et vérifie seulement ses prérequis.
      </p>
      <div className="advisor-form">
        <label>
          <span>Je veux créer</span>
          <select
            className="form-control"
            value={goal}
            onChange={(event) =>
              setGoal(ProjectGoalSchema.parse(event.target.value))
            }
          >
            {goals.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Le résultat fonctionnera</span>
          <select
            className="form-control"
            value={target}
            onChange={(event) =>
              setTarget(ProjectTargetSchema.parse(event.target.value))
            }
          >
            {targets.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Ma priorité</span>
          <select
            className="form-control"
            value={priority}
            onChange={(event) =>
              setPriority(ProjectPrioritySchema.parse(event.target.value))
            }
          >
            {priorities.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="stack-result" aria-live="polite">
        <div className="stack-result-main">
          <div className="stack-result-title">
            <div>
              <p className="eyebrow">RECOMMANDATION</p>
              <h3>{recommendation.primary.label}</h3>
            </div>
            <span
              className={`readiness ${recommendation.readiness === "ready" ? "ready" : "needs-tools"}`}
            >
              {recommendation.readiness === "ready"
                ? "Prêt sur ce PC"
                : `${missingTools.length} prérequis à préparer`}
            </span>
          </div>
          <p>{recommendation.primary.summary}</p>
          <div className="environment-choice">
            <strong>
              {recommendation.environment === "windows"
                ? "Travaillez dans Windows"
                : "Travaillez dans WSL"}
            </strong>
            <span>
              {recommendation.environmentAvailable
                ? "Environnement détecté"
                : "Environnement à préparer"}
            </span>
          </div>
          <ul className="reason-list">
            {recommendation.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <div className="stack-actions">
            {recommendation.projectKind !== null ? (
              <button
                className="primary-button"
                type="button"
                onClick={prepare}
              >
                Préparer ce modèle de projet
              </button>
            ) : (
              <span className="model-note">
                ShellScope explique ce choix, mais ne lance pas encore son
                générateur officiel automatiquement.
              </span>
            )}
            <a
              href={recommendation.primary.documentationUrl}
              target="_blank"
              rel="noreferrer"
            >
              Documentation officielle
            </a>
          </div>
        </div>
        <aside className="stack-result-details">
          <div>
            <h3>Outils requis</h3>
            <div className="tool-readiness-list">
              {recommendation.requiredTools.length === 0 ? (
                <p>Aucune installation requise.</p>
              ) : (
                recommendation.requiredTools.map((tool) => (
                  <div
                    className={`tool-readiness-row${tool.available ? "" : " missing"}`}
                    key={tool.id}
                  >
                    {tool.available ? (
                      <CheckmarkCircle20Filled />
                    ) : (
                      <DismissCircle20Filled />
                    )}
                    <span>
                      <strong>{tool.label}</strong>
                      <small>
                        {tool.available
                          ? (tool.version ?? "Version détectée")
                          : "À préparer pour ce projet"}
                      </small>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div>
            <h3>À éviter au départ</h3>
            <ul className="avoid-list">
              {recommendation.avoid.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="alternative-note">
            <strong>Alternative : {recommendation.alternative.label}</strong>
            <span>{recommendation.alternative.bestFor}</span>
          </div>
        </aside>
      </div>
    </section>
  );
};
