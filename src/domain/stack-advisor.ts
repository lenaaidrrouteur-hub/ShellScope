import { z } from "zod";
import type {
  ProjectKind,
  ShellInfo,
  SystemSnapshot,
} from "../shared/contracts";
import {
  STACKS,
  type StackDefinition,
  type StackId,
  TOOL_LABELS,
  type ToolId,
} from "./stack-catalog";

export const ProjectGoalSchema = z.enum([
  "simple-site",
  "web-app",
  "api",
  "automation",
  "data-ai",
  "windows-desktop",
  "cross-platform-desktop",
  "mobile",
  "cli",
  "background-service",
]);
export type ProjectGoal = z.infer<typeof ProjectGoalSchema>;

export const ProjectTargetSchema = z.enum([
  "windows",
  "linux-cloud",
  "docker",
  "cross-platform",
]);
export type ProjectTarget = z.infer<typeof ProjectTargetSchema>;

export const ProjectPrioritySchema = z.enum([
  "simple",
  "portable",
  "performance",
]);
export type ProjectPriority = z.infer<typeof ProjectPrioritySchema>;

export const StackAdvisorInputSchema = z.object({
  goal: ProjectGoalSchema,
  target: ProjectTargetSchema,
  priority: ProjectPrioritySchema,
});
export type StackAdvisorInput = z.infer<typeof StackAdvisorInputSchema>;

export type StackToolReadiness = {
  readonly id: ToolId;
  readonly label: string;
  readonly available: boolean;
  readonly version: string | null;
  readonly executable: string | null;
};

export type StackRecommendation = {
  readonly primary: StackDefinition;
  readonly alternative: StackDefinition;
  readonly projectKind: ProjectKind | null;
  readonly environment: "windows" | "wsl";
  readonly environmentAvailable: boolean;
  readonly readiness: "ready" | "needs-tools";
  readonly requiredTools: readonly StackToolReadiness[];
  readonly reasons: readonly string[];
  readonly avoidIds: readonly string[];
  readonly avoid: readonly string[];
};

const assertNever = (value: never): never => {
  throw new TypeError(`Valeur de projet non prise en charge: ${String(value)}`);
};

const baseStackFor = (goal: ProjectGoal): StackId => {
  switch (goal) {
    case "simple-site":
      return "static-web";
    case "web-app":
    case "api":
      return "node-typescript";
    case "automation":
    case "data-ai":
    case "cli":
      return "python-uv";
    case "windows-desktop":
      return "dotnet-wpf";
    case "cross-platform-desktop":
      return "tauri";
    case "mobile":
      return "expo";
    case "background-service":
      return "go-service";
    default:
      return assertNever(goal);
  }
};

const alternateFor = (primary: StackId): StackId => {
  switch (primary) {
    case "static-web":
      return "node-typescript";
    case "node-typescript":
    case "docker-node":
      return "python-uv";
    case "python-uv":
      return "node-typescript";
    case "dotnet-wpf":
      return "tauri";
    case "tauri":
      return "dotnet-wpf";
    case "expo":
      return "static-web";
    case "go-service":
      return "node-typescript";
    default:
      return assertNever(primary);
  }
};

const findTool = (
  snapshot: SystemSnapshot,
  environment: "windows" | "wsl",
  id: ToolId,
): ShellInfo | undefined => {
  if (environment === "windows") {
    return snapshot.shells.find((tool) => tool.id === id);
  }
  return snapshot.wslDistributions
    .find((distribution) => distribution.available && !distribution.managed)
    ?.shells.find((tool) => tool.id === id);
};

export const recommendStack = (
  candidate: StackAdvisorInput,
  snapshot: SystemSnapshot,
): StackRecommendation => {
  const input = StackAdvisorInputSchema.parse(candidate);
  const environment =
    input.target === "linux-cloud" || input.target === "docker"
      ? "wsl"
      : "windows";
  let primaryId = baseStackFor(input.goal);
  if (
    (input.priority === "performance" &&
      (input.goal === "api" ||
        input.goal === "cli" ||
        input.goal === "background-service")) ||
    (input.priority === "portable" && input.goal === "cli")
  ) {
    primaryId = "go-service";
  }
  if (
    input.target === "docker" &&
    (primaryId === "node-typescript" || input.goal === "api")
  ) {
    primaryId = "docker-node";
  }
  const primary = STACKS[primaryId];
  const primaryRequiredTools: readonly ToolId[] = primary.requiredTools;
  const requiredIds =
    input.target === "docker" && !primaryRequiredTools.includes("docker")
      ? [...primaryRequiredTools, "docker" as const]
      : primaryRequiredTools;
  const requiredTools = requiredIds.map((id) => {
    const tool = findTool(snapshot, environment, id);
    return {
      id,
      label: TOOL_LABELS[id],
      available: tool?.available === true,
      version: tool?.version ?? null,
      executable: tool?.executable ?? null,
    };
  });
  const environmentAvailable =
    environment === "windows" ||
    snapshot.wslDistributions.some(
      (distribution) => distribution.available && !distribution.managed,
    );
  const ready =
    environmentAvailable && requiredTools.every((tool) => tool.available);
  const avoidDocker = input.target !== "docker";

  return {
    primary,
    alternative: STACKS[alternateFor(primaryId)],
    projectKind: primary.projectKind,
    environment,
    environmentAvailable,
    readiness: ready ? "ready" : "needs-tools",
    requiredTools,
    reasons: [
      primary.bestFor,
      environment === "wsl"
        ? "La cible est Linux: WSL réduit les différences de chemins, permissions et scripts."
        : "La cible reste Windows ou multiplateforme: commencez dans le dossier Windows de ce PC.",
      "Les dépendances seront déclarées dans le projet, jamais ajoutées globalement par défaut.",
    ],
    avoidIds: [
      ...(avoidDocker ? ["docker-too-early"] : []),
      "global-dependencies",
      "microservices-too-early",
    ],
    avoid: [
      ...(avoidDocker
        ? ["Docker tant que le déploiement ou un service isolé ne l’exige pas."]
        : []),
      "Les dépendances globales qui cachent les versions requises par le projet.",
      "Les microservices, monorepos et Kubernetes pour un premier résultat.",
    ],
  };
};
