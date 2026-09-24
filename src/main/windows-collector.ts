import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import {
  type PythonRuntime,
  PythonRuntimeSchema,
  ShellInfoSchema,
  type SystemSnapshot,
  SystemSnapshotSchema,
  type WslDistribution,
} from "../shared/contracts";
import { windowsCollectorScript } from "./windows-collector-script";

const execFileAsync = promisify(execFile);

const RawSnapshotSchema = SystemSnapshotSchema.omit({
  wslDistributions: true,
  pythonRuntimes: true,
}).extend({ wslDistributionNames: z.array(z.string()) });

const wslTools = [
  { id: "bash", name: "Bash", command: "bash" },
  { id: "git", name: "Git", command: "git" },
  { id: "node", name: "Node.js", command: "node" },
  { id: "npm", name: "npm", command: "npm" },
  { id: "bun", name: "Bun", command: "bun" },
  { id: "python", name: "Python", command: "python3" },
  { id: "codex", name: "Codex CLI", command: "codex" },
  { id: "uv", name: "uv", command: "uv" },
  { id: "docker", name: "Docker", command: "docker" },
  { id: "dotnet", name: ".NET SDK", command: "dotnet" },
  { id: "go", name: "Go", command: "go" },
  { id: "rustc", name: "Rust", command: "rustc" },
  { id: "cargo", name: "Cargo", command: "cargo" },
] as const;

const UvRuntimeSchema = z.object({
  key: z.string(),
  version: z.string(),
  path: z.string(),
  symlink: z.string().nullable(),
  variant: z.enum(["default", "freethreaded"]),
  implementation: z.string(),
});

const NpmVersionsSchema = z.object({
  npm: z.string(),
  node: z.string(),
});

const parseUvRuntimes = (output: string): PythonRuntime[] =>
  z
    .array(UvRuntimeSchema)
    .parse(JSON.parse(output))
    .map((runtime) =>
      PythonRuntimeSchema.parse({
        ...runtime,
        managed:
          runtime.path.toLocaleLowerCase().includes("uv\\python") ||
          runtime.path.includes("/.local/share/uv/python/"),
      }),
    );

const collectWindowsPythonRuntimes = async (): Promise<PythonRuntime[]> => {
  try {
    const { stdout } = await execFileAsync(
      "uv.exe",
      ["python", "list", "--only-installed", "--output-format", "json"],
      { encoding: "utf8", timeout: 20_000, windowsHide: true },
    );
    return parseUvRuntimes(stdout);
  } catch {
    return [];
  }
};

const collectWslPythonRuntimes = async (
  distribution: string,
): Promise<PythonRuntime[]> => {
  try {
    const { stdout } = await execFileAsync(
      "wsl.exe",
      [
        "-d",
        distribution,
        "--",
        "uv",
        "python",
        "list",
        "--only-installed",
        "--output-format",
        "json",
      ],
      { encoding: "utf8", timeout: 20_000, windowsHide: true },
    );
    return parseUvRuntimes(stdout);
  } catch {
    return [];
  }
};

const firstLine = (value: string): string | null => {
  const line = value
    .split(/\r?\n/u)
    .find((candidate) => candidate.trim().length > 0);
  return line?.trim() ?? null;
};

const collectWslTool = async (
  distribution: string,
  tool: (typeof wslTools)[number],
) => {
  let paths: readonly string[] = [];
  try {
    const { stdout } = await execFileAsync(
      "wsl.exe",
      ["-d", distribution, "--", "which", "-a", tool.command],
      { encoding: "utf8", timeout: 10_000, windowsHide: true },
    );
    paths = [
      ...new Set(
        stdout
          .split(/\r?\n/u)
          .map((path) => path.trim())
          .filter((path) => path.length > 0),
      ),
    ];
  } catch {
    paths = [];
  }
  const candidates = await Promise.all(
    paths.map(async (path, index) => {
      let version: string | null = null;
      let runtimeVersion: string | null = null;
      let runtimeCompatible: boolean | null = null;
      try {
        const result = await execFileAsync(
          "wsl.exe",
          ["-d", distribution, "--", path, "--version"],
          { encoding: "utf8", timeout: 10_000, windowsHide: true },
        );
        version = firstLine(`${result.stdout}\n${result.stderr}`);
      } catch {
        version = null;
      }
      if (tool.id === "npm") {
        try {
          const result = await execFileAsync(
            "wsl.exe",
            ["-d", distribution, "--", path, "--versions", "--json"],
            { encoding: "utf8", timeout: 10_000, windowsHide: true },
          );
          const runtime = NpmVersionsSchema.parse(JSON.parse(result.stdout));
          runtimeVersion = runtime.node;
          runtimeCompatible = !result.stderr.includes(
            "does not support Node.js",
          );
        } catch {
          runtimeVersion = null;
          runtimeCompatible = null;
        }
      }
      return {
        path,
        version,
        kind: "WSL executable",
        precedence: index + 1,
        runtimeVersion,
        runtimeCompatible,
      };
    }),
  );
  const active = candidates[0];
  return ShellInfoSchema.parse({
    id: tool.id,
    name: tool.name,
    available: active !== undefined,
    executable: active?.path ?? null,
    version: active?.version ?? null,
    candidates,
  });
};

const collectWslDistribution = async (
  name: string,
): Promise<WslDistribution> => {
  const managed = name.toLocaleLowerCase().startsWith("docker-");
  if (managed) {
    return {
      name,
      managed,
      available: true,
      error: null,
      shells: [],
      pythonRuntimes: [],
    };
  }
  try {
    const [shells, pythonRuntimes] = await Promise.all([
      Promise.all(wslTools.map((tool) => collectWslTool(name, tool))),
      collectWslPythonRuntimes(name),
    ]);
    return {
      name,
      managed,
      available: true,
      error: null,
      shells,
      pythonRuntimes,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        name,
        managed,
        available: false,
        error: error.message,
        shells: [],
        pythonRuntimes: [],
      };
    }
    throw error;
  }
};

export const collectWindowsSnapshot = async (): Promise<SystemSnapshot> => {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      windowsCollectorScript,
    ],
    {
      encoding: "utf8",
      timeout: 20_000,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    },
  );
  const raw = RawSnapshotSchema.parse(JSON.parse(stdout));
  const [wslDistributions, pythonRuntimes] = await Promise.all([
    Promise.all(raw.wslDistributionNames.map(collectWslDistribution)),
    collectWindowsPythonRuntimes(),
  ]);
  const { wslDistributionNames: _names, ...snapshot } = raw;
  return SystemSnapshotSchema.parse({
    ...snapshot,
    wslDistributions,
    pythonRuntimes,
  });
};
