import { useState } from "react";
import type { DiagnosticReport } from "../../../shared/contracts";

type EnvironmentAdvisorProps = { report: DiagnosticReport };

const scenarios = {
  windows: {
    label: "Application Windows ou PowerShell",
    choice: "Priorisez Windows",
    reason:
      "Le projet dépend de l’interface Windows, du registre, de PowerShell, de .NET ou d’un logiciel installé sur Windows.",
    location:
      "Gardez le dépôt sur C: ou D: et lancez Codex depuis ce dossier Windows.",
  },
  linux: {
    label: "Serveur Linux, Bash ou outils Linux",
    choice: "Priorisez WSL",
    reason:
      "Le projet sera exécuté sur Linux ou repose sur Bash, les permissions Unix, apt ou des outils natifs Linux.",
    location:
      "Gardez le dépôt sous ~/code dans Ubuntu, pas sous /mnt/c, puis lancez Codex dans WSL.",
  },
  docker: {
    label: "Conteneur Docker",
    choice: "Priorisez WSL",
    reason:
      "Les conteneurs Linux se rapprochent davantage de leur environnement réel depuis WSL et évitent des différences de chemins et permissions.",
    location:
      "Placez le projet dans Ubuntu et utilisez Docker Desktop comme moteur géré.",
  },
  web: {
    label: "Site ou API Node multiplateforme",
    choice: "Choisissez selon le déploiement",
    reason:
      "Pour un déploiement Linux, WSL réduit les surprises. Pour une application intégrée à Windows, restez sur Windows.",
    location:
      "Un projet doit vivre dans un seul environnement; ne partagez pas node_modules entre les deux.",
  },
  python: {
    label: "Projet Python avec uv",
    choice: "Les deux conviennent, mais épinglez Python",
    reason:
      "uv isole Python et les dépendances dans le projet. Choisissez WSL pour une cible Linux et Windows pour une application Windows.",
    location:
      "Utilisez pyproject.toml, .python-version et .venv; évitez pip global.",
  },
} as const;

export const EnvironmentAdvisor = ({ report }: EnvironmentAdvisorProps) => {
  const [scenario, setScenario] = useState<keyof typeof scenarios>("web");
  const advice = scenarios[scenario];
  const userWsl = report.snapshot.wslDistributions.find(
    (distribution) => !distribution.managed,
  );
  const environmentConflicts = report.issues.filter((issue) =>
    issue.id.startsWith("environment-versions-"),
  );

  return (
    <section className="advisor-card" id="advisor">
      <div className="section-heading">
        <div>
          <p className="eyebrow">GUIDE DE DÉCISION</p>
          <h2>Quand utiliser Windows ou WSL?</h2>
        </div>
        <span>Conseil adapté à ce PC</span>
      </div>
      <label className="field-label" htmlFor="scenario">
        Ce que vous voulez construire
      </label>
      <select
        id="scenario"
        className="form-control"
        value={scenario}
        onChange={(event) =>
          setScenario(event.target.value as keyof typeof scenarios)
        }
      >
        {Object.entries(scenarios).map(([value, item]) => (
          <option key={value} value={value}>
            {item.label}
          </option>
        ))}
      </select>
      <div className="advice-result">
        <strong>{advice.choice}</strong>
        <p>{advice.reason}</p>
        <p>{advice.location}</p>
      </div>
      <div className="personalized-note">
        <strong>Sur votre PC</strong>
        <span>
          {userWsl?.name ?? "Aucune distribution WSL utilisateur"} est détectée
          · {environmentConflicts.length} écart
          {environmentConflicts.length === 1 ? "" : "s"} de version entre
          Windows et WSL.
        </span>
      </div>
    </section>
  );
};
