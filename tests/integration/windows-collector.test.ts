import { describe, expect, it } from "vitest";
import { collectWindowsSnapshot } from "../../src/main/windows-collector";

describe.runIf(process.platform === "win32")("collectWindowsSnapshot", () => {
  it("lit les PATH Windows et détecte les shells sans les modifier", async () => {
    const before = process.env.PATH;
    const snapshot = await collectWindowsSnapshot();
    expect(snapshot.computerName.length).toBeGreaterThan(0);
    expect(snapshot.machinePath.length).toBeGreaterThan(0);
    expect(
      snapshot.shells.some((shell) => shell.id === "cmd" && shell.available),
    ).toBe(true);
    const git = snapshot.shells.find((shell) => shell.id === "git");
    expect(git?.candidates.length).toBeGreaterThanOrEqual(2);
    expect(git?.candidates[0]?.path).toBe(git?.executable);
    const npm = snapshot.shells.find((shell) => shell.id === "npm");
    expect(npm?.candidates[0]?.runtimeVersion).toMatch(/^\d+\.\d+\.\d+$/u);
    expect(npm?.candidates[0]?.runtimeCompatible).toBe(true);
    expect(
      snapshot.wslDistributions.some((distro) => distro.name.length > 0),
    ).toBe(true);
    expect(process.env.PATH).toBe(before);
  }, 30_000);
});
