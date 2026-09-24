import type { ProjectKind } from "../shared/contracts";

export type TemplateFile = {
  readonly relativePath: string;
  readonly purpose: string;
  readonly content: string;
};

const agents = (commands: readonly string[]): string => `# Project instructions

- Explain important choices in plain language.
- Choose the right role for each task: architecture, implementation, debugging, testing, or review.
- Understand the goal and constraints before changing files.
- Keep dependencies local to this project; do not install development tools globally.
- Preserve user files and ask before destructive changes.
- Run these checks after changes: ${commands.join(", ")}.
`;

export const templatesFor = (
  kind: ProjectKind,
  projectName: string,
): readonly TemplateFile[] => {
  if (kind === "static-web") {
    return [
      {
        relativePath: "index.html",
        purpose: "Page d’accueil accessible sans framework",
        content: `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${projectName}" />
    <title>${projectName}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main>
      <p class="eyebrow">PROJET PRÊT</p>
      <h1>${projectName}</h1>
      <p>Décrivez ici le résultat que vos visiteurs doivent obtenir.</p>
    </main>
  </body>
</html>
`,
      },
      {
        relativePath: "styles.css",
        purpose: "Style local sans dépendance ni compilation",
        content:
          ":root { color-scheme: dark; font-family: system-ui, sans-serif; background: #0b0d12; color: #f2f5f8; }\n* { box-sizing: border-box; }\nbody { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px; }\nmain { width: min(680px, 100%); }\nh1 { font-size: clamp(2.5rem, 8vw, 5rem); margin: 0; }\np { color: #a6afbd; line-height: 1.6; }\n.eyebrow { color: #8290ff; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; }\n",
      },
      {
        relativePath: "README.md",
        purpose: "Explique comment modifier et ouvrir le site",
        content: `# ${projectName}\n\nSite Web sans installation. Ouvrez \`index.html\` dans un navigateur, puis modifiez le contenu avec Codex.\n`,
      },
      {
        relativePath: "AGENTS.md",
        purpose: "Empêche Codex d’ajouter un framework sans besoin",
        content: `${agents(["ouvrir index.html dans un navigateur"])}\n- N’ajoutez Node.js, un framework ou Docker que si le besoin dépasse HTML, CSS et JavaScript.\n`,
      },
    ];
  }
  if (kind === "node" || kind === "docker-node") {
    const files: TemplateFile[] = [
      {
        relativePath: "package.json",
        purpose: "Déclare le projet et ses commandes locales",
        content: JSON.stringify(
          {
            name: projectName,
            private: true,
            type: "module",
            scripts: {
              dev: "node --watch --experimental-strip-types src/index.ts",
              start: "node --experimental-strip-types src/index.ts",
              test: "node --test",
            },
          },
          null,
          2,
        ),
      },
      {
        relativePath: "README.md",
        purpose: "Explique la structure et les commandes du projet",
        content: `# ${projectName}\n\nProjet Node.js autonome.\n\n- Démarrer : \`npm run dev\`\n- Tester : \`npm test\`\n- Dépendances : les ajouter dans ce projet, jamais globalement.\n`,
      },
      {
        relativePath: "src/index.ts",
        purpose: "Point de départ Node sans dépendance globale",
        content:
          'import { createServer } from "node:http";\n\nconst server = createServer((_request, response) => {\n  response.end("Projet prêt pour Codex\\n");\n});\n\nserver.listen(3000, "127.0.0.1", () => {\n  console.log("http://127.0.0.1:3000");\n});\n',
      },
      {
        relativePath: ".gitignore",
        purpose: "Évite de versionner les fichiers générés",
        content: "node_modules/\n.env\n*.log\n",
      },
      {
        relativePath: "AGENTS.md",
        purpose: "Donne à Codex les règles permanentes du projet",
        content: agents(["npm test"]),
      },
    ];
    if (kind === "docker-node") {
      files.push(
        {
          relativePath: "Dockerfile",
          purpose: "Construit un conteneur Node Linux reproductible",
          content:
            'FROM node:lts-alpine\nWORKDIR /app\nCOPY package.json ./\nCOPY src ./src\nEXPOSE 3000\nCMD ["npm", "start"]\n',
        },
        {
          relativePath: "compose.yaml",
          purpose: "Démarre le conteneur sans commande complexe",
          content:
            'services:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n',
        },
      );
    }
    return files;
  }
  if (kind === "python-uv") {
    return [
      {
        relativePath: "README.md",
        purpose: "Explique uv, Python et les commandes du projet",
        content: `# ${projectName}\n\nProjet Python isolé avec uv.\n\n- Préparer : \`uv sync\`\n- Démarrer : \`uv run main.py\`\n- Ajouter une dépendance : \`uv add nom-du-paquet\`\n- Python est épinglé dans \`.python-version\`.\n`,
      },
      {
        relativePath: "pyproject.toml",
        purpose: "Déclare Python et les dépendances gérées par uv",
        content: `[project]\nname = "${projectName}"\nversion = "0.1.0"\nrequires-python = ">=3.14,<3.15"\ndependencies = []\n`,
      },
      {
        relativePath: ".python-version",
        purpose: "Épingle Python 3.14 standard pour ce projet",
        content: "3.14\n",
      },
      {
        relativePath: "main.py",
        purpose: "Point de départ exécuté avec uv",
        content:
          'def main() -> None:\n    print("Projet uv prêt pour Codex")\n\n\nif __name__ == "__main__":\n    main()\n',
      },
      {
        relativePath: ".gitignore",
        purpose: "Exclut l’environnement virtuel local",
        content: ".venv/\n__pycache__/\n.env\n",
      },
      {
        relativePath: "AGENTS.md",
        purpose: "Donne à Codex les règles permanentes du projet",
        content: agents(["uv run main.py"]),
      },
    ];
  }
  return [
    {
      relativePath: "README.md",
      purpose: "Explique le but avant d’ajouter du code",
      content: `# ${projectName}\n\nDécrivez ici le problème, les utilisateurs et le résultat attendu avant d’ajouter des outils.\n`,
    },
    {
      relativePath: "AGENTS.md",
      purpose: "Donne à Codex les règles permanentes du projet",
      content: agents(["définir puis exécuter les tests du projet"]),
    },
    {
      relativePath: "src/.gitkeep",
      purpose: "Crée un emplacement clair pour le futur code",
      content: "",
    },
  ];
};

export const commandsFor = (kind: ProjectKind): readonly string[] => {
  if (kind === "static-web")
    return [
      "Ouvrir index.html dans un navigateur",
      "Aucune installation requise",
    ];
  if (kind === "node") return ["npm run dev", "npm test"];
  if (kind === "python-uv") return ["uv sync", "uv run main.py"];
  if (kind === "docker-node") return ["docker compose up --build"];
  return [
    "Ouvrir ce dossier dans Codex",
    "Décrire le premier résultat attendu",
  ];
};
