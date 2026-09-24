import { describe, expect, it } from "vitest";
import { analyzeSnapshot } from "../../src/domain/diagnostics";
import { createRepairPreview } from "../../src/domain/repair-preview";
import type { SystemSnapshot } from "../../src/shared/contracts";

describe("createRepairPreview", () => {
  it("retire l'entrée utilisateur ciblée lorsqu'elle existe aussi dans le PATH système", async () => {
    const snapshot: SystemSnapshot = {
      scannedAt: new Date().toISOString(),
      computerName: "TEST-PC",
      os: "Windows",
      architecture: "AMD64",
      homeDirectory: "C:\\Users\\test",
      userPath: "C:\\UserTools;C:\\Program Files\\nodejs",
      machinePath: "C:\\Program Files\\nodejs",
      processPath: "",
      pathExt: ".EXE",
      shells: [],
      pythonRuntimes: [],
      wslDistributions: [],
    };
    const report = await analyzeSnapshot(snapshot);
    const issue = report.issues.find((candidate) =>
      candidate.id.startsWith("cross-"),
    );
    expect(issue).toBeDefined();
    if (issue === undefined) return;

    const preview = createRepairPreview(report, issue.id);

    expect(preview.before).toContain("C:\\Program Files\\nodejs");
    expect(preview.after).toBe("C:\\UserTools");
    expect(preview.removed).toEqual(["C:\\Program Files\\nodejs"]);
  });
});
