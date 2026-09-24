import type { DiagnosticReport, RepairPreview } from "../shared/contracts";
import { RepairPreviewSchema } from "../shared/contracts";

export class RepairPreviewError extends Error {
  public override readonly name = "RepairPreviewError";
}

export const createRepairPreview = (
  report: DiagnosticReport,
  issueId: string,
): RepairPreview => {
  const issue = report.issues.find((candidate) => candidate.id === issueId);
  if (
    issue?.repairable !== true ||
    issue.scope !== "user" ||
    issue.entryIndex === undefined
  ) {
    throw new RepairPreviewError(
      "Cette correction n'est pas disponible automatiquement.",
    );
  }

  const userEntries = report.entries.filter((entry) => entry.scope === "user");
  const target = userEntries.find((entry) => entry.index === issue.entryIndex);
  if (target === undefined) {
    throw new RepairPreviewError("L'entrée PATH visée est introuvable.");
  }

  return RepairPreviewSchema.parse({
    issueId,
    before: report.snapshot.userPath,
    after: userEntries
      .filter((entry) => entry.index !== issue.entryIndex)
      .map((entry) => entry.raw)
      .join(";"),
    removed: [target.raw || "(entrée vide)"],
    scope: "user",
  });
};
