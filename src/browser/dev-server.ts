import type { IncomingMessage, ServerResponse } from "node:http";
import { homedir } from "node:os";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";
import { z } from "zod";
import { analyzeSnapshot } from "../domain/diagnostics";
import { askCodex } from "../main/codex-service";
import { createProject, previewProject } from "../main/project-service";
import { RepairService } from "../main/repair-service";
import { collectWindowsSnapshot } from "../main/windows-collector";
import {
  type DiagnosticReport,
  DiagnosticReportSchema,
  ProjectRequestSchema,
  RepairPreviewSchema,
} from "../shared/contracts";

const host = "127.0.0.1";
const port = 4317;
const IssueRequestSchema = z.object({ issueId: z.string() });
let report: DiagnosticReport | null = null;
let repairService: RepairService | null = null;

class RequestBodyError extends Error {
  public override readonly name = "RequestBodyError";
}

const backupRoot = join(
  process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"),
  "ShellScope",
  "backups",
);

const scan = async (): Promise<DiagnosticReport> => {
  report = await analyzeSnapshot(await collectWindowsSnapshot());
  repairService ??= new RepairService(backupRoot, report);
  repairService.updateReport(report);
  return report;
};

const readJson = async (request: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 5 * 1024 * 1024) {
      throw new RequestBodyError(
        "La requête dépasse la limite locale de 5 Mo.",
      );
    }
    chunks.push(buffer);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  if (body.length === 0) throw new RequestBodyError("Corps JSON manquant.");
  return JSON.parse(body);
};

const sendJson = (
  response: ServerResponse,
  status: number,
  value: unknown,
): void => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
};

const requireRepairService = (): RepairService => {
  if (repairService === null) {
    throw new RequestBodyError("Lancez d'abord une analyse.");
  }
  return repairService;
};

const handleApi = async (
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> => {
  const pathname = new URL(request.url ?? "/", `http://${host}`).pathname;
  if (request.method === "GET" && pathname === "/api/scan") {
    sendJson(response, 200, await scan());
    return;
  }
  if (request.method === "POST" && pathname === "/api/preview") {
    const input = IssueRequestSchema.parse(await readJson(request));
    sendJson(response, 200, requireRepairService().preview(input.issueId));
    return;
  }
  if (request.method === "POST" && pathname === "/api/apply") {
    const input = RepairPreviewSchema.parse(await readJson(request));
    sendJson(response, 200, await requireRepairService().apply(input));
    return;
  }
  if (request.method === "POST" && pathname === "/api/codex") {
    const input = DiagnosticReportSchema.parse(await readJson(request));
    sendJson(response, 200, await askCodex(input));
    return;
  }
  if (request.method === "POST" && pathname === "/api/project/preview") {
    const input = ProjectRequestSchema.parse(await readJson(request));
    sendJson(response, 200, await previewProject(input));
    return;
  }
  if (request.method === "POST" && pathname === "/api/project/create") {
    const input = ProjectRequestSchema.parse(await readJson(request));
    sendJson(response, 200, await createProject(input));
    return;
  }
  sendJson(response, 404, { error: "Route locale introuvable." });
};

const vite = await createServer({
  root: new URL("../renderer", import.meta.url).pathname.replace(
    /^\/([A-Z]:)/u,
    "$1",
  ),
  plugins: [
    react(),
    {
      name: "shellscope-local-api",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (!request.url?.startsWith("/api/")) {
            next();
            return;
          }
          void handleApi(request, response).catch((error: unknown) => {
            const message =
              error instanceof Error ? error.message : "Erreur inconnue";
            sendJson(response, 500, { error: message });
          });
        });
      },
    },
  ],
  server: { host, port, strictPort: true },
});

await vite.listen();
console.log(`ShellScope prêt dans Codex Desktop : http://${host}:${port}`);
