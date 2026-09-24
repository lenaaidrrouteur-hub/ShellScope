import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { analyzeSnapshot } from "../domain/diagnostics";
import { createRepairPreview } from "../domain/repair-preview";
import {
  type DiagnosticReport,
  type RepairPreview,
  RepairPreviewSchema,
  type RepairResult,
} from "../shared/contracts";
import { collectWindowsSnapshot } from "./windows-collector";

const execFileAsync = promisify(execFile);
const BackupSchema = z.object({ userPath: z.string() });

export const encodeSetEnvCommand = (
  variableName: string,
  value: string,
  target: "User" | "Machine" = "User",
): string =>
  Buffer.from(
    `[Environment]::SetEnvironmentVariable('${variableName.replaceAll("'", "''")}', '${value.replaceAll("'", "''")}', '${target}')`,
    "utf16le",
  ).toString("base64");

export class RepairService {
  public constructor(
    private readonly backupDir: string,
    private report: DiagnosticReport,
  ) {}

  public updateReport(report: DiagnosticReport): void {
    this.report = report;
  }

  public preview(issueId: string): RepairPreview {
    return createRepairPreview(this.report, issueId);
  }

  public async apply(candidate: RepairPreview): Promise<RepairResult> {
    const preview = RepairPreviewSchema.parse(candidate);
    if (
      preview.before !== this.report.snapshot.userPath ||
      preview.after !== this.preview(preview.issueId).after
    ) {
      return {
        ok: false,
        message: "Le PATH a changé depuis l'aperçu. Relancez l'analyse.",
      };
    }
    await mkdir(this.backupDir, { recursive: true });
    const stamp = new Date().toISOString().replaceAll(":", "-");
    const backupPath = join(this.backupDir, `path-user-${stamp}.json`);
    await writeFile(
      backupPath,
      JSON.stringify(
        { createdAt: new Date().toISOString(), userPath: preview.before },
        null,
        2,
      ),
      "utf8",
    );
    await execFileAsync(
      "powershell.exe",
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        encodeSetEnvCommand("Path", preview.after),
      ],
      {
        encoding: "utf8",
        timeout: 20_000,
        windowsHide: true,
      },
    );
    const actual = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        "[Environment]::GetEnvironmentVariable('Path','User')",
      ],
      { encoding: "utf8", windowsHide: true },
    );
    if (actual.stdout.trim() !== preview.after.trim()) {
      const backup = BackupSchema.parse(
        JSON.parse(await readFile(backupPath, "utf8")),
      );
      await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-EncodedCommand", encodeSetEnvCommand("Path", backup.userPath)],
        { encoding: "utf8", windowsHide: true },
      );
      return {
        ok: false,
        message: "La vérification a échoué; la sauvegarde a été restaurée.",
      };
    }
    const report = await analyzeSnapshot(await collectWindowsSnapshot());
    this.report = report;
    return { ok: true, backupPath, report };
  }
}
