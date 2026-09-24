# ShellScope Design System

## 0. Research Log

- Embedded refs: shortlisted Linear, Sentry et Warp; choix de taste-skill + Linear pour une console précise, calme et technique.
- Lazyweb: 3 recherches, 3 écrans examinés (Bun, Termius, AppSignal); retenu: navigation latérale fixe, détail contextuel, densité progressive et états très lisibles.
- Imagen drafts: `design-research/concept-dark.png`, `design-research/concept-light.png`; concept sombre retenu comme contrat de fidélité.
- Skipped lanes: aucune.

## 1. Atmosphere & Identity

Un centre de contrôle Windows calme et honnête. La signature est la « trace sûre » : chaque alerte mène de la preuve à l'explication, puis à un aperçu avant/après et à un retour arrière.

## 2. Color

| Role | Token | Value | Usage |
|---|---|---|---|
| Canvas | `--surface-canvas` | `#0b0d12` | Fond application |
| Panel | `--surface-panel` | `#11151c` | Navigation et panneaux |
| Raised | `--surface-raised` | `#171c25` | Cartes et sélection |
| Hover | `--surface-hover` | `#1d2430` | Survol |
| Primary text | `--text-primary` | `#f2f5f8` | Titres, valeurs |
| Secondary text | `--text-secondary` | `#a6afbd` | Explications |
| Muted text | `--text-muted` | `#737e8e` | Métadonnées |
| Border | `--border-default` | `#28303c` | Structure |
| Accent | `--accent-primary` | `#6c7cff` | Actions et focus |
| Success | `--status-success` | `#43c6a5` | Sain |
| Warning | `--status-warning` | `#f0b44d` | Attention |
| Error | `--status-error` | `#ff6b6b` | Bloquant |
| Info | `--status-info` | `#62a0ff` | Information |

Contraste texte normal supérieur à 4.5:1. La couleur n'est jamais l'unique signal.

## 3. Typography

- UI: Segoe UI Variable, Segoe UI, sans-serif.
- Technique: Cascadia Code, Consolas, monospace.
- Échelle: 12, 13, 14, 16, 20, 28 et 40 px; poids 400, 510, 600.
- Titres compacts, interlettrage légèrement négatif à partir de 20 px.

## 4. Spacing & Layout

- Base 4 px; rythme principal 8, 12, 16, 24, 32 px.
- Shell borné à 100dvh; navigation 220 px fixe, contenu seul défilable.
- Tableau de bord en grille intrinsèque; détail à droite à partir de 1180 px, empilé dessous autrement.
- Aucun défilement horizontal à 375 px; chaînes sans espace avec `overflow-wrap:anywhere`.

## 5. Components

- `AppShell`: navigation fixe, barre supérieure, zone principale défilable.
- `HealthRing`: score numérique et libellé textuel.
- `StatusCard`: nom, état, version et nombre d'entrées ou de lanceurs; états sain, info, attention, critique, absent, hover et focus; une carte Windows ne reprend jamais la sévérité d'une anomalie WSL.
- `IssueRow`: sévérité, titre, preuve courte et source; états normal, sélectionné, focus.
- `SeverityPolicy`: Critique signifie qu'un résultat, workflow, LLM ou log peut changer ou être bloqué; Attention signifie un risque sans impact confirmé; Info signifie aucun impact observé.
- `EvidencePanel`: explication, preuve et aperçu avant/après.
- `PrimaryButton`: accent; états hover, pressed, focus-visible, disabled, busy.
- `SafetyNotice`: sauvegarde et confirmation explicites.
- `ConfirmDialog`: décrit exactement la valeur modifiée; annuler reste l'action initiale.
- `StackAdvisor`: questionnaire de trois choix en français simple (résultat, cible, priorité), puis recommandation expliquée; états recommandation prête, environnement absent, outils requis manquants, alternative et focus. Un outil optionnel absent n'est jamais présenté comme une panne globale.
- `ToolReadinessRow`: nom, état détecté ou requis, version active et environnement; états prêt, manquant et non requis. La couleur est doublée par un libellé textuel.

## 6. Motion

- 120 ms pour hover/press, 180 ms pour panneaux; `ease-out`.
- Seuls opacité et transform sont animés.
- `prefers-reduced-motion` supprime toutes les transitions non essentielles.

## 7. Depth

Séparation par luminance et bordures 1 px. Une seule ombre douce pour les dialogues; aucune ombre décorative sur les cartes.

## 8. Accessibility & Accepted Debt

- Navigation clavier complète, focus 2 px, cibles minimales 40 px.
- Libellés et annonces ARIA pour analyse et application.
- Textes en français simple, détails techniques révélés progressivement.
- Les choix d'architecture commencent par le résultat attendu; les noms de technologies n'apparaissent qu'après la recommandation afin de réduire la charge cognitive des utilisateurs non développeurs.
- Dette acceptée V0.1: pas encore de lecteur d'écran automatisé; vérification clavier et sémantique manuelle obligatoire.
