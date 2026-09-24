import ky from "ky";
import { z } from "zod";
import {
  CodexInsightSchema,
  DiagnosticReportSchema,
  ProjectCreateResultSchema,
  ProjectPlanSchema,
  RepairPreviewSchema,
  RepairResultSchema,
  type ShellScopeApi,
} from "../../shared/contracts";

const ErrorResponseSchema = z.object({ error: z.string() });
const client = ky.create({ prefix: "/api/", timeout: 180_000 });

export class BrowserApiError extends Error {
  public override readonly name = "BrowserApiError";
}

const data = async (response: Response): Promise<unknown> => {
  const candidate: unknown = await response.json();
  if (!response.ok) {
    const parsed = ErrorResponseSchema.safeParse(candidate);
    throw new BrowserApiError(
      parsed.success ? parsed.data.error : `Erreur HTTP ${response.status}`,
    );
  }
  return candidate;
};

export const createBrowserApi = (): ShellScopeApi => ({
  scan: async () =>
    DiagnosticReportSchema.parse(
      await data(await client.get("scan", { throwHttpErrors: false })),
    ),
  previewRepair: async (issueId) =>
    RepairPreviewSchema.parse(
      await data(
        await client.post("preview", {
          json: { issueId },
          throwHttpErrors: false,
        }),
      ),
    ),
  applyRepair: async (preview) =>
    RepairResultSchema.parse(
      await data(
        await client.post("apply", { json: preview, throwHttpErrors: false }),
      ),
    ),
  askCodex: async (report) =>
    CodexInsightSchema.parse(
      await data(
        await client.post("codex", { json: report, throwHttpErrors: false }),
      ),
    ),
  previewProject: async (request) =>
    ProjectPlanSchema.parse(
      await data(
        await client.post("project/preview", {
          json: request,
          throwHttpErrors: false,
        }),
      ),
    ),
  createProject: async (request) =>
    ProjectCreateResultSchema.parse(
      await data(
        await client.post("project/create", {
          json: request,
          throwHttpErrors: false,
        }),
      ),
    ),
});
