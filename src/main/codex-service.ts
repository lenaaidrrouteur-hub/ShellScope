import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type CodexInsight,
  CodexInsightSchema,
  type DiagnosticReport,
  DiagnosticReportSchema,
} from "../shared/contracts";
import { runWithInput } from "./process-runner";

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "risks", "recommendations"],
  properties: {
    summary: { type: "string" },
    risks: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
  },
} as const;

export const askCodex = async (
  candidate: DiagnosticReport,
): Promise<CodexInsight> => {
  const report = DiagnosticReportSchema.parse(candidate);
  const directory = await mkdtemp(join(tmpdir(), "shellscope-codex-"));
  const schemaPath = join(directory, "schema.json");
  const resultPath = join(directory, "result.json");
  try {
    await writeFile(schemaPath, JSON.stringify(outputSchema), "utf8");
    const prompt = [
      "Tu es l'analyste de ShellScope. Explique ce rapport Windows et WSL en français simple.",
      "Ne propose aucune commande destructive et ne prétends pas avoir modifié le PC.",
      "Priorise les risques concrets. Les recommandations doivent être prudentes et réversibles.",
      "Politique de sévérité ShellScope: critique si le résultat, un workflow, le LLM ou ses logs peuvent changer ou être bloqués; attention si un risque existe sans impact confirmé; info si aucun impact n'est observé.",
      "Pour chaque outil avec plusieurs candidates, explique la précédence: #1 est lancé par ce processus et les suivants sont masqués.",
      "Distingue une vraie différence de versions d'un alias, wrapper, shim ou second chemin vers la même installation.",
      "Compare explicitement Windows aux distributions WSL non gérées et explique les conflits internes à chaque distribution.",
      "Explique quand privilégier Windows ou WSL selon la cible du projet, sans recommander de mélanger un même environnement virtuel ou node_modules entre les deux.",
      "Analyse les Python inventoriés par uv. Une variante freethreaded exige une validation des dépendances natives et ne doit pas être recommandée par défaut sans bénéfice mesuré.",
      "Explique les risques de compatibilité sans inventer de version inconnue et ne conseille jamais une suppression avant d'avoir identifié le propriétaire, les dépendances et un retour arrière.",
      JSON.stringify(report),
    ].join("\n\n");
    await runWithInput(
      "codex.exe",
      [
        "exec",
        "--sandbox",
        "read-only",
        "--ephemeral",
        "--ignore-rules",
        "--skip-git-repo-check",
        "--output-schema",
        schemaPath,
        "--output-last-message",
        resultPath,
        "-",
      ],
      { input: prompt, timeout: 120_000 },
    );
    return CodexInsightSchema.parse(
      JSON.parse(await readFile(resultPath, "utf8")),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};
