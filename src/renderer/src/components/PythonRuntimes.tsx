import type {
  DiagnosticReport,
  PythonRuntime,
} from "../../../shared/contracts";

type PythonRuntimesProps = { report: DiagnosticReport };

const uniqueRuntimes = (
  runtimes: readonly PythonRuntime[],
): readonly PythonRuntime[] => {
  const seen = new Set<string>();
  return runtimes.filter((runtime) => {
    const key = `${runtime.version}:${runtime.variant}:${runtime.implementation}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const RuntimeList = ({ runtimes }: { runtimes: readonly PythonRuntime[] }) => (
  <div className="runtime-list">
    {uniqueRuntimes(runtimes).map((runtime) => (
      <div className="runtime-row" key={`${runtime.key}:${runtime.variant}`}>
        <span>
          Python {runtime.version}
          {runtime.variant === "freethreaded" ? "t" : ""}
        </span>
        <strong
          className={
            runtime.variant === "freethreaded" ? "free-threaded" : undefined
          }
        >
          {runtime.variant === "freethreaded" ? "Sans GIL" : "Standard"}
        </strong>
      </div>
    ))}
    {runtimes.length === 0 && <p>Aucun inventaire uv disponible.</p>}
  </div>
);

export const PythonRuntimes = ({ report }: PythonRuntimesProps) => {
  const userDistributions = report.snapshot.wslDistributions.filter(
    (distribution) => !distribution.managed,
  );
  const hasFreeThreaded = [
    ...report.snapshot.pythonRuntimes,
    ...userDistributions.flatMap((distribution) => distribution.pythonRuntimes),
  ].some((runtime) => runtime.variant === "freethreaded");
  const uvVersion = report.snapshot.shells.find(
    (shell) => shell.id === "uv",
  )?.version;
  const uvLabel = uvVersion?.match(/uv\s+\S+/u)?.[0] ?? "uv non détecté";

  return (
    <section className="python-card" id="python">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PYTHON GÉRÉ PAR UV</p>
          <h2>Versions et Python 3.14 sans GIL</h2>
        </div>
        <span>
          {hasFreeThreaded
            ? "Version free-threaded détectée"
            : "Aucune version free-threaded"}
        </span>
      </div>
      <div className="python-columns">
        <div>
          <h3>Windows</h3>
          <RuntimeList runtimes={report.snapshot.pythonRuntimes} />
        </div>
        {userDistributions.map((distribution) => (
          <div key={distribution.name}>
            <h3>{distribution.name}</h3>
            <RuntimeList runtimes={distribution.pythonRuntimes} />
          </div>
        ))}
      </div>
      <div className="compatibility-grid">
        <div>
          <strong>Bon candidat au sans GIL</strong>
          <p>
            Calcul CPU réellement parallèle avec plusieurs threads et
            dépendances déclarant un support free-threaded.
          </p>
        </div>
        <div>
          <strong>À valider dans le projet</strong>
          <p>
            Les extensions C ou Rust doivent fournir une roue cp314t; sinon
            elles peuvent réactiver le GIL.
          </p>
          <div className="python-links">
            <a
              href="https://py-free-threading.github.io/tracking/"
              target="_blank"
              rel="noreferrer"
            >
              État des bibliothèques
            </a>
            <a
              href="https://hugovk.github.io/free-threaded-wheels/"
              target="_blank"
              rel="noreferrer"
            >
              Roues free-threaded
            </a>
          </div>
        </div>
        <div>
          <strong>Conseil par défaut</strong>
          <p>
            Restez sur Python 3.14 standard sauf besoin mesuré. {uvLabel} peut
            isoler chaque variante.
          </p>
        </div>
      </div>
    </section>
  );
};
