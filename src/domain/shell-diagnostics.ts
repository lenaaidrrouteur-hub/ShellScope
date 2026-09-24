import type { Issue, ShellInfo, SystemSnapshot } from "../shared/contracts";

const coreShellIds = new Set([
  "pwsh",
  "powershell",
  "cmd",
  "git",
  "wsl",
  "codex",
]);

const candidateEvidence = (candidates: ShellInfo["candidates"]): string =>
  candidates
    .map((candidate) => {
      const runtime = candidate.runtimeVersion
        ? ` · Node ${candidate.runtimeVersion} · ${candidate.runtimeCompatible === false ? "incompatible" : "compatible"}`
        : "";
      return `#${candidate.precedence}${candidate.precedence === 1 ? " actif" : " masqué"} · ${candidate.version ?? "version inconnue"}${runtime} · ${candidate.path}`;
    })
    .join("\n");

const versionToken = (value: string | null): string | null =>
  value?.match(/\d+(?:\.\d+){1,3}(?:[._+-][a-z0-9.-]+)?/iu)?.[0] ?? null;

const slug = (value: string): string =>
  value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/(^-|-$)/gu, "");

const contextualId = (
  base: string,
  context: string,
  shellId: string,
): string =>
  context === "Windows"
    ? `${base}-${shellId}`
    : `${base}-${slug(context)}-${shellId}`;

const launcherIssues = (
  shell: ShellInfo,
  context = "Windows",
): readonly Issue[] => {
  if (!shell.available) {
    return context === "Windows" && coreShellIds.has(shell.id)
      ? [
          {
            id: `shell-${shell.id}`,
            severity: shell.id === "codex" ? "critical" : "info",
            title: `${shell.name} non détecté`,
            explanation: `${shell.name} n'est pas accessible depuis l'environnement actuel.`,
            evidence: shell.executable ?? "Commande introuvable",
            repairable: false,
          },
        ]
      : [];
  }
  if (
    shell.id === "npm" &&
    shell.candidates.some((candidate) => candidate.runtimeCompatible === false)
  ) {
    return [
      {
        id: contextualId("shell-runtime", context, shell.id),
        severity: "critical",
        title: `npm incompatible avec Node dans ${context}`,
        explanation:
          "Critique : au moins un lanceur npm est exécuté par une version de Node qu'il ne prend pas en charge. Les installations, scripts et workflows peuvent échouer ou produire un résultat incorrect.",
        evidence: `${context}\n${candidateEvidence(shell.candidates)}`,
        repairable: false,
      },
    ];
  }
  if (shell.candidates.length < 2) return [];

  const versions = new Set(
    shell.candidates.flatMap((candidate) => {
      const token = versionToken(candidate.version);
      return token === null ? [] : [token.toLocaleLowerCase()];
    }),
  );
  const evidence = `${context}\n${candidateEvidence(shell.candidates)}`;
  if (versions.size > 1) {
    const verifiedNpmToolchains = shell.candidates.filter(
      (candidate) => candidate.runtimeCompatible === true,
    );
    const compatibleNpmToolchains =
      shell.id === "npm" &&
      shell.candidates.every(
        (candidate) => candidate.runtimeCompatible === true,
      );
    return [
      {
        id: contextualId("shell-versions", context, shell.id),
        severity: "warning",
        title: `Versions concurrentes de ${shell.name} dans ${context}`,
        explanation: compatibleNpmToolchains
          ? "Attention : plusieurs couples npm + Node existent, mais chacun a été exécuté et vérifié compatible. Le premier couple du PATH est actif; aucun impact actif n'est confirmé."
          : shell.id === "npm" && verifiedNpmToolchains.length > 0
            ? "Attention : tous les couples npm + Node exécutables ont été vérifiés compatibles. Au moins un shim masqué reste non vérifiable dans ce shell; aucun impact actif n'est confirmé."
            : "Attention : l'ordre actuel lance clairement la première version, mais le résultat peut changer si le PATH ou le shell change. Aucun impact actif n'est confirmé.",
        evidence,
        repairable: false,
      },
    ];
  }
  const hasUnknownVersion = shell.candidates.some(
    (candidate) => versionToken(candidate.version) === null,
  );
  if (shell.id === "codex" && hasUnknownVersion) {
    return [
      {
        id: contextualId("shell-unverified", context, "codex"),
        severity: "warning",
        title: `Lanceurs Codex non vérifiables dans ${context}`,
        explanation:
          "Attention : les lanceurs masqués ne sont pas tous comparables. Ils peuvent changer le workflow LLM si l'ordre du PATH change, mais aucun impact actif n'est confirmé.",
        evidence,
        repairable: false,
      },
    ];
  }
  return [
    {
      id: contextualId("shell-launchers", context, shell.id),
      severity: hasUnknownVersion ? "warning" : "info",
      title: `Plusieurs lanceurs pour ${shell.name} dans ${context}`,
      explanation: hasUnknownVersion
        ? "Attention : plusieurs lanceurs existent sans preuve suffisante qu'ils produisent le même résultat."
        : "Plusieurs chemins démarrent cet outil; le premier est actif et les suivants sont masqués.",
      evidence,
      repairable: false,
    },
  ];
};

const environmentIssues = (snapshot: SystemSnapshot): readonly Issue[] =>
  snapshot.wslDistributions
    .filter((distribution) => distribution.available && !distribution.managed)
    .flatMap((distribution) =>
      distribution.shells.flatMap((linuxShell): readonly Issue[] => {
        if (!linuxShell.available) return [];
        const windowsShell = snapshot.shells.find(
          (candidate) => candidate.id === linuxShell.id,
        );
        if (windowsShell?.available !== true) return [];
        const windowsVersion = versionToken(windowsShell.version);
        const linuxVersion = versionToken(linuxShell.version);
        if (windowsVersion === null || linuxVersion === null) return [];
        if (
          windowsVersion.toLocaleLowerCase() ===
          linuxVersion.toLocaleLowerCase()
        )
          return [];
        return [
          {
            id: `environment-versions-${linuxShell.id}-${slug(distribution.name)}`,
            severity: "warning",
            title: `Version différente entre Windows et ${distribution.name}`,
            explanation:
              "Attention : Windows et WSL sont des environnements distincts. Cette différence devient problématique seulement si un même projet ou ses fichiers générés sont mélangés entre les deux.",
            evidence: `Windows ${windowsVersion} · ${distribution.name} ${linuxVersion}`,
            repairable: false,
          },
        ];
      }),
    );

export const inspectShells = (snapshot: SystemSnapshot): readonly Issue[] => [
  ...snapshot.shells.flatMap((shell) => launcherIssues(shell)),
  ...snapshot.wslDistributions.flatMap((distribution) =>
    distribution.managed
      ? []
      : distribution.shells.flatMap((shell) =>
          launcherIssues(shell, `WSL ${distribution.name}`),
        ),
  ),
  ...environmentIssues(snapshot),
];
