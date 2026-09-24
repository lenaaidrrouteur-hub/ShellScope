import { useEffect, useState } from "react";
import type {
  ProjectKind,
  ProjectPlan,
  ProjectRequest,
} from "../../../shared/contracts";
import { ProjectKindSchema } from "../../../shared/contracts";
import { shellScopeApi } from "../api";

type ProjectWizardProps = {
  readonly homeDirectory: string;
  readonly recommendedKind: ProjectKind | null;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Erreur inconnue";

export const ProjectWizard = ({
  homeDirectory,
  recommendedKind,
}: ProjectWizardProps) => {
  const [basePath, setBasePath] = useState(homeDirectory);
  const [name, setName] = useState("mon-projet");
  const [kind, setKind] = useState<ProjectKind>("codex");
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (recommendedKind === null) return;
    setKind(recommendedKind);
    setPlan(null);
  }, [recommendedKind]);

  const request = (): ProjectRequest => ({ basePath, name, kind });
  const preview = async () => {
    setBusy(true);
    setMessage("");
    try {
      setPlan(await shellScopeApi.previewProject(request()));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const create = async () => {
    if (
      plan?.ready !== true ||
      !window.confirm(`Créer ${plan.targetPath} et y initialiser Git?`)
    )
      return;
    setBusy(true);
    try {
      const result = await shellScopeApi.createProject(request());
      setMessage(result.message);
      setPlan(await shellScopeApi.previewProject(request()));
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="project-card" id="project">
      <div className="section-heading">
        <div>
          <p className="eyebrow">DÉMARRAGE GUIDÉ</p>
          <h2>Créer un vrai projet pour Codex</h2>
        </div>
        <span>Aucun outil installé globalement</span>
      </div>
      <div className="project-form">
        <label>
          <span>Dossier parent</span>
          <input
            className="form-control"
            value={basePath}
            onChange={(event) => {
              setBasePath(event.target.value);
              setPlan(null);
            }}
          />
        </label>
        <label>
          <span>Nom du projet</span>
          <input
            className="form-control"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setPlan(null);
            }}
          />
        </label>
        <label>
          <span>Type</span>
          <select
            className="form-control"
            value={kind}
            onChange={(event) => {
              setKind(ProjectKindSchema.parse(event.target.value));
              setPlan(null);
            }}
          >
            <option value="codex">Projet Codex à définir</option>
            <option value="static-web">Site Web sans installation</option>
            <option value="node">Node.js TypeScript</option>
            <option value="python-uv">Python avec uv</option>
            <option value="docker-node">Node dans Docker</option>
          </select>
        </label>
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={() => void preview()}
        >
          Prévisualiser
        </button>
      </div>
      {plan && (
        <div className="project-preview">
          <div>
            <p className="eyebrow">CIBLE</p>
            <strong>{plan.targetPath}</strong>
            <span>
              {plan.environment === "wsl" ? "Projet WSL" : "Projet Windows"}
            </span>
          </div>
          <ul>
            {plan.files.map((file) => (
              <li key={file.relativePath}>
                <code>{file.relativePath}</code> · {file.purpose}
              </li>
            ))}
          </ul>
          <div className="project-commands">
            <p className="eyebrow">ENSUITE</p>
            {plan.commands.map((command) => (
              <code key={command}>{command}</code>
            ))}
          </div>
          {plan.blocker ? (
            <p className="project-blocker">{plan.blocker}</p>
          ) : (
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={() => void create()}
            >
              Créer après confirmation
            </button>
          )}
        </div>
      )}
      {message && <p className="project-message">{message}</p>}
    </section>
  );
};
