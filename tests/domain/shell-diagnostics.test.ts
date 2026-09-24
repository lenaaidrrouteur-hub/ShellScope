import { describe, expect, it } from "vitest";
import { inspectShells } from "../../src/domain/shell-diagnostics";
import { SystemSnapshotSchema } from "../../src/shared/contracts";

describe("inspectShells", () => {
  it("ne traite pas un outil de projet optionnel absent comme une erreur", () => {
    const snapshot = SystemSnapshotSchema.parse({
      scannedAt: "2026-08-03T12:00:00.000Z",
      computerName: "TEST-PC",
      os: "Windows 11",
      architecture: "AMD64",
      homeDirectory: "C:\\Users\\test",
      userPath: "",
      machinePath: "",
      processPath: "",
      pathExt: ".EXE",
      shells: [
        {
          id: "dotnet",
          name: ".NET SDK",
          available: false,
          executable: null,
          version: null,
          candidates: [],
        },
      ],
      pythonRuntimes: [],
      wslDistributions: [],
    });

    expect(inspectShells(snapshot)).toEqual([]);
  });
});
