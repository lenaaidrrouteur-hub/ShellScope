import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createProject, previewProject } from "../../src/main/project-service";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

describe("project-service", () => {
  it("prépare un site statique sans installer Node ni Docker", async () => {
    const basePath = await mkdtemp(join(tmpdir(), "shellscope-static-"));
    roots.push(basePath);
    const request = {
      basePath,
      name: "site-simple",
      kind: "static-web",
    } as const;

    const plan = await previewProject(request);

    expect(plan.ready).toBe(true);
    expect(plan.files.map((file) => file.relativePath)).toEqual(
      expect.arrayContaining(["index.html", "styles.css", "AGENTS.md"]),
    );
    expect(plan.commands).toEqual([
      "Ouvrir index.html dans un navigateur",
      "Aucune installation requise",
    ]);
  });

  it("prévisualise puis crée un projet Python uv sans installation globale", async () => {
    const basePath = await mkdtemp(join(tmpdir(), "shellscope-project-"));
    roots.push(basePath);
    const request = { basePath, name: "demo-uv", kind: "python-uv" } as const;

    const plan = await previewProject(request);
    expect(plan.ready).toBe(true);
    expect(plan.files.map((file) => file.relativePath)).toContain("AGENTS.md");
    expect(plan.commands).toContain("uv run main.py");

    const result = await createProject(request);
    expect(result.ok).toBe(true);
    expect((await stat(join(result.targetPath, ".git"))).isDirectory()).toBe(
      true,
    );
    expect(
      await readFile(join(result.targetPath, ".python-version"), "utf8"),
    ).toBe("3.14\n");

    const secondPlan = await previewProject(request);
    expect(secondPlan.ready).toBe(false);
    expect(secondPlan.blocker).toContain("existe déjà");
  });
});
