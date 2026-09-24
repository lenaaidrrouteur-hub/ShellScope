import { execFile } from "node:child_process";
import type { Stats } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import {
  type ProjectCreateResult,
  type ProjectPlan,
  ProjectPlanSchema,
  type ProjectRequest,
  ProjectRequestSchema,
} from "../shared/contracts";
import { commandsFor, templatesFor } from "./project-templates";

const execFileAsync = promisify(execFile);

class ProjectPathError extends Error {
  public override readonly name = "ProjectPathError";
}

const targetFor = (request: ProjectRequest): string => {
  if (!isAbsolute(request.basePath)) {
    throw new ProjectPathError("Le dossier parent doit être un chemin absolu.");
  }
  const base = resolve(request.basePath);
  const target = resolve(base, request.name);
  const nested = relative(base, target);
  if (nested.startsWith("..") || isAbsolute(nested)) {
    throw new ProjectPathError(
      "Le projet doit rester dans le dossier parent choisi.",
    );
  }
  return target;
};

const statOrNull = async (path: string): Promise<Stats | null> => {
  try {
    return await stat(path);
  } catch (error) {
    if (error instanceof Error && Reflect.get(error, "code") === "ENOENT") {
      return null;
    }
    throw error;
  }
};

export const previewProject = async (
  candidate: ProjectRequest,
): Promise<ProjectPlan> => {
  const request = ProjectRequestSchema.parse(candidate);
  const targetPath = targetFor(request);
  const base = await statOrNull(resolve(request.basePath));
  const target = await statOrNull(targetPath);
  const blocker =
    target !== null
      ? "Le dossier cible existe déjà; ShellScope ne l'écrasera pas."
      : base === null
        ? "Le dossier parent n'existe pas."
        : !base.isDirectory()
          ? "Le chemin parent n'est pas un dossier."
          : null;

  return ProjectPlanSchema.parse({
    request,
    targetPath,
    files: templatesFor(request.kind, request.name).map(
      ({ relativePath, purpose }) => ({ relativePath, purpose }),
    ),
    commands: commandsFor(request.kind),
    environment: request.basePath.startsWith("\\\\wsl$\\") ? "wsl" : "windows",
    ready: blocker === null,
    blocker,
  });
};

export const createProject = async (
  candidate: ProjectRequest,
): Promise<ProjectCreateResult> => {
  const plan = await previewProject(candidate);
  if (!plan.ready) {
    return {
      ok: false,
      targetPath: plan.targetPath,
      message: plan.blocker ?? "Le projet ne peut pas être créé.",
    };
  }
  await mkdir(plan.targetPath);
  for (const file of templatesFor(plan.request.kind, plan.request.name)) {
    const destination = join(plan.targetPath, file.relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, file.content, {
      encoding: "utf8",
      flag: "wx",
    });
  }
  try {
    await execFileAsync("git.exe", ["init", plan.targetPath], {
      encoding: "utf8",
      timeout: 20_000,
      windowsHide: true,
    });
    return {
      ok: true,
      targetPath: plan.targetPath,
      message: "Projet créé et dépôt Git initialisé.",
    };
  } catch (error) {
    return {
      ok: false,
      targetPath: plan.targetPath,
      message:
        error instanceof Error
          ? `Les fichiers sont créés, mais Git a échoué : ${error.message}`
          : "Les fichiers sont créés, mais Git a échoué.",
    };
  }
};
