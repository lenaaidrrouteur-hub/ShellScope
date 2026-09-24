import {
  ArrowRight20Regular,
  ShieldCheckmark20Regular,
} from "@fluentui/react-icons";
import type { Issue, RepairPreview, Severity } from "../../../shared/contracts";

const severityLabel: Record<Severity, string> = {
  critical: "Critique",
  warning: "Attention",
  info: "Info",
};

type Props = {
  readonly issue: Issue | null;
  readonly preview: RepairPreview | null;
  readonly busy: boolean;
  readonly onPreview: () => void;
  readonly onConfirm: () => void;
};

export const DetailPanel = ({
  issue,
  preview,
  busy,
  onPreview,
  onConfirm,
}: Props) => (
  <aside className="detail-panel" aria-live="polite">
    {issue === null ? (
      <div className="detail-empty">
        <span>Sélectionnez un problème</span>
        <p>La preuve et les options sûres apparaîtront ici.</p>
      </div>
    ) : (
      <>
        <div className="detail-header">
          <span className={`severity-label ${issue.severity}`}>
            {severityLabel[issue.severity]}
          </span>
          <h2>{issue.title}</h2>
        </div>
        <section>
          <h3>Ce que cela signifie</h3>
          <p>{issue.explanation}</p>
        </section>
        <section>
          <h3>Preuve</h3>
          <code>{issue.evidence}</code>
        </section>
        {preview === null ? (
          <button
            className="secondary-button"
            type="button"
            disabled={!issue.repairable || busy}
            onClick={onPreview}
          >
            {issue.repairable
              ? "Prévisualiser la correction"
              : "Correction manuelle requise"}
          </button>
        ) : (
          <>
            <section>
              <div className="safety-line">
                <ShieldCheckmark20Regular />
                Sauvegarde créée avant modification
              </div>
              <h3>Aperçu de la correction</h3>
              <div className="diff">
                <code>{preview.before}</code>
                <ArrowRight20Regular />
                <code>{preview.after}</code>
              </div>
            </section>
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? "Vérification…" : "Appliquer après confirmation"}
            </button>
          </>
        )}
      </>
    )}
  </aside>
);
