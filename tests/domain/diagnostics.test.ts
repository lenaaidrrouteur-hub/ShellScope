import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeSnapshot } from "../../src/domain/diagnostics";
import type { SystemSnapshot } from "../../src/shared/contracts";

const directories: string[] = [];

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

const snapshot = (userPath: string, machinePath: string): SystemSnapshot => ({
  scannedAt: new Date().toISOString(),
  computerName: "TEST-PC",
  os: "Windows",
  architecture: "AMD64",
  homeDirectory: "C:\\Users\\test",
  userPath,
  machinePath,
  processPath: `${machinePath};${userPath}`,
  pathExt: ".EXE;.CMD",
  shells: [
    {
      id: "codex",
      name: "Codex CLI",
      available: true,
      executable: "C:\\codex.exe",
      version: "1.0.0",
      candidates: [
        {
          path: "C:\\codex.exe",
          version: "1.0.0",
          kind: "Application",
          precedence: 1,
        },
      ],
    },
  ],
  pythonRuntimes: [],
  wslDistributions: [],
});

describe("analyzeSnapshot", () => {
  it("détecte un dossier manquant, une entrée vide et un doublon", async () => {
    const root = await mkdtemp(join(tmpdir(), "shellscope-test-"));
    directories.push(root);
    const valid = join(root, "valid");
    await mkdir(valid);
    const report = await analyzeSnapshot(
      snapshot(`${valid};;${valid};${join(root, "missing")}`, ""),
    );
    const userIssues = report.issues.filter((issue) => issue.scope === "user");
    expect(userIssues.some((issue) => issue.id.startsWith("missing-"))).toBe(
      true,
    );
    expect(userIssues.some((issue) => issue.id.startsWith("empty-"))).toBe(
      true,
    );
    expect(userIssues.some((issue) => issue.id.startsWith("duplicate-"))).toBe(
      true,
    );
    expect(report.score).toBeLessThan(100);
  });

  it("signale un outil non disponible sans proposer de correction automatique", async () => {
    const data = snapshot("", "");
    const report = await analyzeSnapshot({
      ...data,
      shells: [
        {
          id: "wsl",
          name: "WSL",
          available: false,
          executable: null,
          version: null,
          candidates: [],
        },
      ],
    });
    expect(report.issues).toContainEqual(
      expect.objectContaining({ id: "shell-wsl", repairable: false }),
    );
  });

  it("conserve un score exploitable lorsque seules des attentions s'accumulent", async () => {
    const root = await mkdtemp(join(tmpdir(), "shellscope-score-"));
    directories.push(root);
    const valid = join(root, "valid");
    await mkdir(valid);
    const repeatedPath = Array.from({ length: 15 }, () => valid).join(";");

    const report = await analyzeSnapshot(snapshot(repeatedPath, ""));

    expect(report.issues.every((issue) => issue.severity !== "critical")).toBe(
      true,
    );
    expect(report.score).toBeGreaterThanOrEqual(70);
  });

  it("ne traite pas l'agrégation du PATH de processus comme un doublon", async () => {
    const root = await mkdtemp(join(tmpdir(), "shellscope-process-"));
    directories.push(root);
    const valid = join(root, "valid");
    await mkdir(valid);
    const report = await analyzeSnapshot(snapshot(valid, ""));
    expect(
      report.issues.some(
        (issue) =>
          issue.scope === "process" && issue.id.startsWith("duplicate-"),
      ),
    ).toBe(false);
  });
});
