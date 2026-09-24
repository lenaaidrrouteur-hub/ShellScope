import {
  ArrowClockwise24Regular,
  Bot24Regular,
  Play24Filled,
  ShieldCheckmark20Regular,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useState } from "react";
import type {
  CodexInsight,
  DiagnosticReport,
  Issue,
  ProjectKind,
  RepairPreview,
} from "../../shared/contracts";
import { shellScopeApi } from "./api";
import { DetailPanel } from "./components/DetailPanel";
import { EnvironmentMatrix } from "./components/EnvironmentMatrix";
import { IssueList } from "./components/IssueList";
import { ProjectWizard } from "./components/ProjectWizard";
import { PythonRuntimes } from "./components/PythonRuntimes";
import { Sidebar } from "./components/Sidebar";
import { StackAdvisor } from "./components/StackAdvisor";
import { StatusCards } from "./components/StatusCards";

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Erreur inconnue";

export const App = () => {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [preview, setPreview] = useState<RepairPreview | null>(null);
  const [insight, setInsight] = useState<CodexInsight | null>(null);
  const [recommendedKind, setRecommendedKind] = useState<ProjectKind | null>(
    null,
  );
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState(
    "Analyse de votre environnement Windows…",
  );

  const scan = useCallback(async () => {
    setBusy(true);
    setMessage("Analyse de votre environnement Windows…");
    try {
      const next = await shellScopeApi.scan();
      setReport(next);
      setSelected(next.issues[0] ?? null);
      setPreview(null);
      setMessage(
        `Analyse terminée à ${new Date(next.snapshot.scannedAt).toLocaleTimeString("fr-CA")}`,
      );
    } catch (error) {
      setMessage(`Analyse impossible : ${errorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void scan();
  }, [scan]);

  const selectIssue = (issue: Issue) => {
    setSelected(issue);
    setPreview(null);
  };
  const createPreview = async () => {
    if (selected === null) return;
    setBusy(true);
    try {
      setPreview(await shellScopeApi.previewRepair(selected.id));
    } catch (error) {
      setMessage(`Aperçu impossible : ${errorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  };
  const applyRepair = async () => {
    if (
      preview === null ||
      !window.confirm(
        "ShellScope va sauvegarder puis remplacer uniquement votre PATH utilisateur. Continuer?",
      )
    )
      return;
    setBusy(true);
    try {
      const result = await shellScopeApi.applyRepair(preview);
      if (result.ok) {
        setReport(result.report);
        setSelected(result.report.issues[0] ?? null);
        setPreview(null);
        setMessage(`Correction vérifiée. Sauvegarde : ${result.backupPath}`);
      } else setMessage(result.message);
    } catch (error) {
      setMessage(`Correction impossible : ${errorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  };
  const analyzeWithCodex = async () => {
    if (report === null) return;
    setBusy(true);
    setMessage("Codex étudie le rapport en lecture seule…");
    try {
      setInsight(await shellScopeApi.askCodex(report));
      setMessage("Analyse Codex terminée.");
    } catch (error) {
      setMessage(`Codex n'a pas répondu : ${errorMessage(error)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main" id="overview">
        <header className="topbar">
          <div>
            <p className="eyebrow">DIAGNOSTIC LOCAL</p>
            <h1>Vue d’ensemble</h1>
          </div>
          <div className="actions">
            <button
              id="codex"
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => void analyzeWithCodex()}
            >
              <Bot24Regular />
              Analyser avec Codex
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={busy}
              onClick={() => void scan()}
            >
              {busy ? (
                <ArrowClockwise24Regular className="spin" />
              ) : (
                <Play24Filled />
              )}
              {busy ? "Analyse…" : "Analyser ce PC"}
            </button>
          </div>
        </header>
        <div className="content">
          <div className="safety-banner">
            <ShieldCheckmark20Regular />
            <span>
              <strong>Analyse locale en lecture seule.</strong> Une sauvegarde
              et votre confirmation sont requises avant toute correction.
            </span>
          </div>
          {report === null ? (
            <div className="loading-card">
              <div className="loader" />
              <h2>Inspection du PATH et des shells</h2>
              <p>{message}</p>
            </div>
          ) : (
            <>
              <section className="overview">
                <div className="health-card">
                  <div
                    className="health-ring"
                    style={{
                      background: `radial-gradient(circle closest-side, var(--surface-panel) 79%, transparent 80%), conic-gradient(var(--accent-primary) ${report.score * 3.6}deg, #252c3d 0)`,
                    }}
                  >
                    <span>{report.score}</span>
                    <small>/100</small>
                  </div>
                  <div>
                    <p className="eyebrow">ÉTAT GLOBAL</p>
                    <h2>
                      {report.score >= 90
                        ? "Excellent"
                        : report.score >= 70
                          ? "Correct"
                          : "À corriger"}
                    </h2>
                    <p>
                      {report.issues.length} élément
                      {report.issues.length > 1 ? "s" : ""} à examiner.
                    </p>
                  </div>
                </div>
                <div className="scan-summary">
                  <span>{message}</span>
                  <strong>{report.snapshot.computerName}</strong>
                  <span>
                    {report.snapshot.os} · {report.snapshot.architecture}
                  </span>
                </div>
              </section>
              <div id="path">
                <StatusCards report={report} />
              </div>
              <EnvironmentMatrix report={report} />
              <StackAdvisor
                report={report}
                onUseRecommendation={setRecommendedKind}
              />
              <PythonRuntimes report={report} />
              <ProjectWizard
                homeDirectory={report.snapshot.homeDirectory}
                recommendedKind={recommendedKind}
              />
              {insight && (
                <section className="codex-card">
                  <div>
                    <Bot24Regular />
                    <strong>Lecture de Codex</strong>
                  </div>
                  <p>{insight.summary}</p>
                  <ul>
                    {insight.recommendations.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              )}
              <div className="workspace" id="issues">
                <IssueList
                  issues={report.issues}
                  selectedId={selected?.id ?? null}
                  onSelect={selectIssue}
                />
                <DetailPanel
                  issue={selected}
                  preview={preview}
                  busy={busy}
                  onPreview={() => void createPreview()}
                  onConfirm={() => void applyRepair()}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};
