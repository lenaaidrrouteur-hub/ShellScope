import { describe, expect, it } from "vitest";
import { analyzeSnapshot } from "../../src/domain/diagnostics";
import type { SystemSnapshot } from "../../src/shared/contracts";

const snapshot = (
  shells: SystemSnapshot["shells"],
  wslDistributions: SystemSnapshot["wslDistributions"] = [],
): SystemSnapshot => ({
  scannedAt: new Date().toISOString(),
  computerName: "TEST-PC",
  os: "Windows",
  architecture: "AMD64",
  homeDirectory: "C:\\Users\\test",
  userPath: "",
  machinePath: "",
  processPath: "",
  pathExt: ".EXE;.CMD",
  shells,
  pythonRuntimes: [],
  wslDistributions,
});

describe("sévérité des versions et lanceurs", () => {
  it("classe en attention des versions masquées sans impact observé", async () => {
    const report = await analyzeSnapshot(
      snapshot([
        {
          id: "git",
          name: "Git",
          available: true,
          executable: "C:\\Program Files\\Git\\cmd\\git.exe",
          version: "2.55.0",
          candidates: [
            {
              path: "C:\\Program Files\\Git\\cmd\\git.exe",
              version: "2.55.0",
              kind: "Application",
              precedence: 1,
            },
            {
              path: "C:\\Tools\\Git\\cmd\\git.exe",
              version: "2.53.0",
              kind: "Application",
              precedence: 2,
            },
          ],
        },
      ]),
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: "shell-versions-git",
        severity: "warning",
        repairable: false,
      }),
    );
  });

  it("classe Codex en attention lorsque les lanceurs masqués restent non vérifiables", async () => {
    const report = await analyzeSnapshot(
      snapshot([
        {
          id: "codex",
          name: "Codex CLI",
          available: true,
          executable: "C:\\Codex\\codex.exe",
          version: null,
          candidates: [
            {
              path: "C:\\Codex\\codex.exe",
              version: null,
              kind: "Application",
              precedence: 1,
            },
            {
              path: "C:\\Users\\test\\bin\\codex.cmd",
              version: null,
              kind: "Application",
              precedence: 2,
            },
          ],
        },
      ]),
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: "shell-unverified-codex",
        severity: "warning",
      }),
    );
  });

  it("distingue plusieurs lanceurs identiques d'un conflit de versions", async () => {
    const report = await analyzeSnapshot(
      snapshot([
        {
          id: "codex",
          name: "Codex CLI",
          available: true,
          executable: "C:\\Codex\\codex.exe",
          version: "0.146.0",
          candidates: [
            {
              path: "C:\\Codex\\codex.exe",
              version: "0.146.0",
              kind: "Application",
              precedence: 1,
            },
            {
              path: "C:\\Users\\test\\bin\\codex.cmd",
              version: "0.146.0",
              kind: "ExternalScript",
              precedence: 2,
            },
          ],
        },
      ]),
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: "shell-launchers-codex",
        severity: "info",
      }),
    );
    expect(
      report.issues.some((issue) => issue.id === "shell-versions-codex"),
    ).toBe(false);
  });

  it("classe en attention une version WSL différente de Windows", async () => {
    const report = await analyzeSnapshot(
      snapshot(
        [
          {
            id: "git",
            name: "Git",
            available: true,
            executable: "C:\\Git\\git.exe",
            version: "2.55.0",
            candidates: [
              {
                path: "C:\\Git\\git.exe",
                version: "2.55.0",
                kind: "Application",
                precedence: 1,
              },
            ],
          },
        ],
        [
          {
            name: "Ubuntu",
            managed: false,
            available: true,
            error: null,
            pythonRuntimes: [],
            shells: [
              {
                id: "git",
                name: "Git",
                available: true,
                executable: "/usr/bin/git",
                version: "git version 2.51.0",
                candidates: [
                  {
                    path: "/usr/bin/git",
                    version: "git version 2.51.0",
                    kind: "Executable",
                    precedence: 1,
                  },
                ],
              },
            ],
          },
        ],
      ),
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: "environment-versions-git-ubuntu",
        severity: "warning",
      }),
    );
  });

  it("classe critique un npm incompatible avec le Node qui l'exécute", async () => {
    const report = await analyzeSnapshot(
      snapshot([
        {
          id: "npm",
          name: "npm",
          available: true,
          executable: "C:\\Program Files\\nodejs\\npm.cmd",
          version: "12.0.1",
          candidates: [
            {
              path: "C:\\Program Files\\nodejs\\npm.cmd",
              version: "12.0.1",
              kind: "Application",
              precedence: 1,
              runtimeVersion: "20.17.0",
              runtimeCompatible: false,
            },
          ],
        },
      ]),
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        id: "shell-runtime-npm",
        severity: "critical",
      }),
    );
  });
});
