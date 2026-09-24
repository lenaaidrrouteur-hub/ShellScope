import { _electron as electron, expect, test } from "@playwright/test";

const packagedExecutable = process.env.SHELLSCOPE_PACKAGED_EXE;

test("l'exécutable Windows empaqueté analyse le PC", async () => {
  if (packagedExecutable === undefined) {
    test.skip(true, "Exécutable empaqueté non demandé");
    return;
  }
  const application = await electron.launch({
    executablePath: packagedExecutable,
  });
  try {
    const page = await application.firstWindow();
    await expect(page.getByText(/Analyse terminée à/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: "Problèmes détectés" }),
    ).toBeVisible();
    await expect(page.locator(".health-ring span")).toHaveText("76");
    await expect(page.getByText("Critiques 0")).toBeVisible();
    await expect(page.locator(".severity-label.warning").first()).toBeVisible();
  } finally {
    await application.close();
  }
});
