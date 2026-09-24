# ShellScope

Application Windows personnelle qui analyse le PATH, les shells et Codex, explique les anomalies en français et propose uniquement des corrections réversibles.

## Fonctions

- Compare les outils et leurs versions sous Windows et dans chaque distribution WSL.
- Explique quand privilégier Windows, WSL ou Docker selon le projet.
- Inventorie avec uv les Python standards et free-threaded, dont Python 3.14t.
- Prévisualise puis crée des projets Codex, Node.js, Python uv ou Docker sans écraser un dossier existant.
- Ajoute un dépôt Git, un README et des instructions AGENTS.md à chaque nouveau projet.

## Sécurité

- L'analyse est en lecture seule.
- Codex reçoit un rapport structuré et ne modifie jamais directement le système.
- Une correction affiche toujours un aperçu avant/après.
- La version 0.1 corrige uniquement le PATH utilisateur.
- Chaque correction crée une sauvegarde locale avant écriture.

## Développement

```powershell
bun install
bun run dev
bun run browser:dev
bun run check
bun run package:win
```
