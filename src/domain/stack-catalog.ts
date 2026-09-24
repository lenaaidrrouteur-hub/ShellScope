import type { ProjectKind } from "../shared/contracts";

export const TOOL_IDS = [
  "node",
  "npm",
  "uv",
  "docker",
  "dotnet",
  "rustc",
  "cargo",
  "go",
] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const STACK_IDS = [
  "static-web",
  "node-typescript",
  "python-uv",
  "docker-node",
  "dotnet-wpf",
  "tauri",
  "expo",
  "go-service",
] as const;
export type StackId = (typeof STACK_IDS)[number];

export type StackDefinition = {
  readonly id: StackId;
  readonly label: string;
  readonly summary: string;
  readonly bestFor: string;
  readonly avoidWhen: string;
  readonly requiredTools: readonly ToolId[];
  readonly projectKind: ProjectKind | null;
  readonly documentationUrl: string;
};

export const STACKS = {
  "static-web": {
    id: "static-web",
    label: "Web statique (HTML, CSS, JavaScript)",
    summary: "Le départ le plus léger pour une page ou un petit site.",
    bestFor:
      "Présentation, documentation, formulaire simple ou prototype visuel.",
    avoidWhen:
      "Comptes utilisateurs, base de données ou logique serveur complexe.",
    requiredTools: [],
    projectKind: "static-web",
    documentationUrl:
      "https://developer.mozilla.org/fr/docs/Learn_web_development",
  },
  "node-typescript": {
    id: "node-typescript",
    label: "Node.js avec TypeScript",
    summary:
      "Un seul langage pour le Web, une API et les échanges en temps réel.",
    bestFor:
      "Application Web interactive, API, WebSocket et intégrations réseau.",
    avoidWhen:
      "Analyse scientifique lourde ou interface Windows profondément native.",
    requiredTools: ["node"],
    projectKind: "node",
    documentationUrl: "https://nodejs.org/learn/typescript/run-natively",
  },
  "python-uv": {
    id: "python-uv",
    label: "Python géré par uv",
    summary: "Python et ses dépendances restent isolés dans le projet.",
    bestFor:
      "Automatisation, données, IA, scripts, API et outils en ligne de commande.",
    avoidWhen:
      "Interface Windows native riche ou application mobile publiée en boutique.",
    requiredTools: ["uv"],
    projectKind: "python-uv",
    documentationUrl: "https://docs.astral.sh/uv/guides/projects/",
  },
  "docker-node": {
    id: "docker-node",
    label: "Node.js dans Docker",
    summary:
      "Une cible Linux reproductible quand le conteneur est réellement requis.",
    bestFor:
      "API déployée en conteneur, CI Linux ou services locaux reproductibles.",
    avoidWhen: "Premier prototype local sans exigence de déploiement Linux.",
    requiredTools: ["node", "docker"],
    projectKind: "docker-node",
    documentationUrl: "https://docs.docker.com/guides/nodejs/",
  },
  "dotnet-wpf": {
    id: "dotnet-wpf",
    label: ".NET avec WPF",
    summary: "Le choix direct pour une application de bureau propre à Windows.",
    bestFor:
      "Registre, services Windows, matériel, intégration Office ou interface native.",
    avoidWhen:
      "L’application doit aussi fonctionner sur macOS, Linux ou mobile.",
    requiredTools: ["dotnet"],
    projectKind: null,
    documentationUrl: "https://learn.microsoft.com/dotnet/desktop/",
  },
  tauri: {
    id: "tauri",
    label: "Tauri avec TypeScript et Rust",
    summary:
      "Une application de bureau multiplateforme avec une interface Web légère.",
    bestFor:
      "Application installable Windows, macOS et Linux avec accès système contrôlé.",
    avoidWhen:
      "Vous voulez un tout premier projet très simple ou éviter les prérequis Rust.",
    requiredTools: ["node", "rustc", "cargo"],
    projectKind: null,
    documentationUrl: "https://v2.tauri.app/start/",
  },
  expo: {
    id: "expo",
    label: "React Native avec Expo",
    summary: "Le chemin guidé pour une application Android, iOS et Web.",
    bestFor:
      "Application mobile avec navigation, caméra, notifications et publication.",
    avoidWhen: "Le besoin est seulement un site Web adaptatif.",
    requiredTools: ["node", "npm"],
    projectKind: null,
    documentationUrl: "https://docs.expo.dev/get-started/create-a-project/",
  },
  "go-service": {
    id: "go-service",
    label: "Go",
    summary: "Un exécutable autonome, rapide et simple à déployer.",
    bestFor:
      "Service réseau, CLI distribuée ou tâche concurrente à faible empreinte.",
    avoidWhen: "IA et données Python, ou interface utilisateur riche.",
    requiredTools: ["go"],
    projectKind: null,
    documentationUrl: "https://go.dev/doc/tutorial/getting-started",
  },
} as const satisfies Record<StackId, StackDefinition>;

export const TOOL_LABELS = {
  node: "Node.js",
  npm: "npm",
  uv: "uv",
  docker: "Docker",
  dotnet: ".NET SDK",
  rustc: "Rust",
  cargo: "Cargo",
  go: "Go",
} as const satisfies Record<ToolId, string>;
