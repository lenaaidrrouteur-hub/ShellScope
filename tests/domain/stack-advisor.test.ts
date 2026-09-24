import { describe, expect, it } from "vitest";
import { recommendStack } from "../../src/domain/stack-advisor";
import { SystemSnapshotSchema } from "../../src/shared/contracts";

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
      id: "node",
      name: "Node.js",
      available: true,
      executable: "C:\\Program Files\\nodejs\\node.exe",
      version: "v24.0.0",
      candidates: [],
    },
    {
      id: "uv",
      name: "uv",
      available: true,
      executable: "C:\\Users\\test\\.local\\bin\\uv.exe",
      version: "uv 0.8.0",
      candidates: [],
    },
    {
      id: "dotnet",
      name: ".NET SDK",
      available: false,
      executable: null,
      version: null,
      candidates: [],
    },
    {
      id: "docker",
      name: "Docker",
      available: true,
      executable: "C:\\Program Files\\Docker\\docker.exe",
      version: "Docker version 28.0.0",
      candidates: [],
    },
  ],
  pythonRuntimes: [],
  wslDistributions: [
    {
      name: "Ubuntu",
      managed: false,
      available: true,
      error: null,
      shells: [
        {
          id: "node",
          name: "Node.js",
          available: true,
          executable: "/usr/bin/node",
          version: "v24.0.0",
          candidates: [],
        },
        {
          id: "docker",
          name: "Docker",
          available: true,
          executable: "/usr/bin/docker",
          version: "Docker version 28.0.0",
          candidates: [],
        },
      ],
      pythonRuntimes: [],
    },
  ],
});

describe("recommendStack", () => {
  it("choisit le Web statique pour un site simple sans infrastructure", () => {
    const result = recommendStack(
      { goal: "simple-site", target: "windows", priority: "simple" },
      snapshot,
    );

    expect(result.primary.id).toBe("static-web");
    expect(result.projectKind).toBe("static-web");
    expect(result.environment).toBe("windows");
    expect(result.avoidIds).toContain("docker-too-early");
  });

  it("choisit Python avec uv pour automatiser sans polluer Python global", () => {
    const result = recommendStack(
      { goal: "automation", target: "windows", priority: "simple" },
      snapshot,
    );

    expect(result.primary.id).toBe("python-uv");
    expect(result.projectKind).toBe("python-uv");
    expect(result.requiredTools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "uv", available: true }),
      ]),
    );
  });

  it("choisit Node TypeScript dans WSL pour une application web Linux", () => {
    const result = recommendStack(
      { goal: "web-app", target: "linux-cloud", priority: "simple" },
      snapshot,
    );

    expect(result.primary.id).toBe("node-typescript");
    expect(result.environment).toBe("wsl");
    expect(result.requiredTools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "node", available: true }),
      ]),
    );
  });

  it("recommande .NET pour une application Windows native sans cacher le prérequis manquant", () => {
    const result = recommendStack(
      {
        goal: "windows-desktop",
        target: "windows",
        priority: "simple",
      },
      snapshot,
    );

    expect(result.primary.id).toBe("dotnet-wpf");
    expect(result.environment).toBe("windows");
    expect(result.readiness).toBe("needs-tools");
    expect(result.requiredTools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "dotnet", available: false }),
      ]),
    );
  });

  it("ajoute Docker seulement quand la cible le demande", () => {
    const result = recommendStack(
      { goal: "api", target: "docker", priority: "simple" },
      snapshot,
    );

    expect(result.primary.id).toBe("docker-node");
    expect(result.projectKind).toBe("docker-node");
    expect(result.environment).toBe("wsl");
    expect(result.requiredTools.map((tool) => tool.id)).toEqual([
      "node",
      "docker",
    ]);
  });

  it("préfère Go pour distribuer un outil terminal autonome", () => {
    const result = recommendStack(
      { goal: "cli", target: "cross-platform", priority: "portable" },
      snapshot,
    );

    expect(result.primary.id).toBe("go-service");
    expect(result.readiness).toBe("needs-tools");
    expect(result.requiredTools).toEqual([
      expect.objectContaining({ id: "go", available: false }),
    ]);
  });
});
