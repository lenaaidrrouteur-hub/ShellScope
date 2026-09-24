import { _electron as electron, expect, test } from "@playwright/test";

test("analyse le PC et affiche un diagnostic exploitable", async () => {
  const application = await electron.launch({
    args: ["."],
    cwd: process.cwd(),
  });
  try {
    const page = await application.firstWindow();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(
      page.getByRole("heading", { name: "Vue d’ensemble" }),
    ).toBeVisible();
    await expect(page.getByText(/Analyse terminée à/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole("heading", { name: "Problèmes détectés" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Que construire et avec quels outils?",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Versions et Python 3.14 sans GIL" }),
    ).toBeVisible();
    await expect(page.getByText("Sans GIL").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Créer un vrai projet pour Codex" }),
    ).toBeVisible();
    await expect(
      page
        .locator(".status-card")
        .filter({ has: page.getByText("Go", { exact: true }) })
        .locator(".status"),
    ).toContainText("Optionnel");
    await expect(page.getByText(/3 lanceurs/).first()).toBeVisible();
    await expect(
      page
        .locator(".status-card")
        .filter({ hasText: "Git" })
        .locator(".warning"),
    ).toContainText("Attention");
    await expect(
      page
        .locator(".status-card")
        .filter({ hasText: "Codex CLI" })
        .locator(".warning"),
    ).toContainText("Attention");
    await expect(
      page
        .locator(".status-card")
        .filter({ hasText: "Node.js" })
        .locator(".ok"),
    ).toContainText("Détecté");
    await expect(
      page.locator(".status-card").filter({ hasText: "Python" }).locator(".ok"),
    ).toContainText("Détecté");
    await expect(
      page.getByRole("heading", { name: "Versions concurrentes de Git" }),
    ).toBeVisible();
    await expect(
      page.locator(".detail-panel .severity-label.warning"),
    ).toContainText("Attention");
    await expect(page.locator(".conflict-label").first()).toContainText(
      "Attention",
    );
    await expect(
      page.getByText("Critique = résultat ou workflow affecté", {
        exact: false,
      }),
    ).toBeVisible();
    await expect(
      page.locator(".detail-panel code").filter({ hasText: "#1 actif" }),
    ).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    const previewButton = page.getByRole("button", {
      name: "Prévisualiser la correction",
    });
    if (await previewButton.count()) {
      await previewButton.click();
      await expect(page.getByText("Aperçu de la correction")).toBeVisible();
      await expect(
        page.getByText("Sauvegarde créée avant modification"),
      ).toBeVisible();
    }
    await page.getByLabel("Je veux créer").selectOption("automation");
    await expect(
      page.getByRole("heading", { name: "Python géré par uv" }),
    ).toBeVisible();
    await expect(page.getByText("Prêt sur ce PC")).toBeVisible();
    await page
      .getByRole("button", { name: "Préparer ce modèle de projet" })
      .click();
    await expect(page.getByLabel("Type")).toHaveValue("python-uv");
    await page.getByLabel("Nom du projet").fill("shellscope-e2e-preview");
    await page.getByRole("button", { name: "Prévisualiser" }).click();
    await expect(page.getByText("uv run main.py")).toBeVisible();
    await page.screenshot({
      path: "test-results/shellscope-dashboard.png",
      fullPage: false,
    });
  } finally {
    await application.close();
  }
});

test("obtient une explication structurée de Codex", async () => {
  test.setTimeout(180_000);
  const application = await electron.launch({
    args: ["."],
    cwd: process.cwd(),
  });
  try {
    const page = await application.firstWindow();
    await expect(page.getByText(/Analyse terminée à/)).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "Analyser avec Codex" }).click();
    await expect(page.getByText("Analyse Codex terminée.")).toBeVisible({
      timeout: 140_000,
    });
    await expect(page.getByText("Lecture de Codex")).toBeVisible();
  } finally {
    await application.close();
  }
});
