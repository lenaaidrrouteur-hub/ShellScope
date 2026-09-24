import { join } from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import { analyzeSnapshot } from "../domain/diagnostics";
import {
  DiagnosticReportSchema,
  ProjectRequestSchema,
  RepairPreviewSchema,
} from "../shared/contracts";
import { askCodex } from "./codex-service";
import { createProject, previewProject } from "./project-service";
import { RepairService } from "./repair-service";
import { collectWindowsSnapshot } from "./windows-collector";

let repairService: RepairService | null = null;

const scan = async () => {
  const report = await analyzeSnapshot(await collectWindowsSnapshot());
  repairService =
    repairService === null
      ? new RepairService(join(app.getPath("userData"), "backups"), report)
      : repairService;
  repairService.updateReport(report);
  return report;
};

const createWindow = (): void => {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0b0d12",
    webPreferences: {
      preload: join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.once("ready-to-show", () => window.show());
  if (process.env.ELECTRON_RENDERER_URL)
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void window.loadFile(join(__dirname, "../renderer/index.html"));
};

app.whenReady().then(() => {
  ipcMain.handle("shellscope:scan", scan);
  ipcMain.handle("shellscope:preview", (_event, issueId: unknown) => {
    if (typeof issueId !== "string" || repairService === null)
      throw new Error("Lancez d'abord une analyse.");
    return repairService.preview(issueId);
  });
  ipcMain.handle("shellscope:apply", (_event, preview: unknown) => {
    if (repairService === null) throw new Error("Lancez d'abord une analyse.");
    return repairService.apply(RepairPreviewSchema.parse(preview));
  });
  ipcMain.handle("shellscope:codex", (_event, report: unknown) =>
    askCodex(DiagnosticReportSchema.parse(report)),
  );
  ipcMain.handle("shellscope:project-preview", (_event, request: unknown) =>
    previewProject(ProjectRequestSchema.parse(request)),
  );
  ipcMain.handle("shellscope:project-create", (_event, request: unknown) =>
    createProject(ProjectRequestSchema.parse(request)),
  );
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
