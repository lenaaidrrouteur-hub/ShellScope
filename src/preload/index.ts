import { contextBridge, ipcRenderer } from "electron";
import type {
  DiagnosticReport,
  ProjectRequest,
  RepairPreview,
  ShellScopeApi,
} from "../shared/contracts";

const api: ShellScopeApi = {
  scan: () => ipcRenderer.invoke("shellscope:scan"),
  previewRepair: (issueId) => ipcRenderer.invoke("shellscope:preview", issueId),
  applyRepair: (preview: RepairPreview) =>
    ipcRenderer.invoke("shellscope:apply", preview),
  askCodex: (report: DiagnosticReport) =>
    ipcRenderer.invoke("shellscope:codex", report),
  previewProject: (request: ProjectRequest) =>
    ipcRenderer.invoke("shellscope:project-preview", request),
  createProject: (request: ProjectRequest) =>
    ipcRenderer.invoke("shellscope:project-create", request),
};

contextBridge.exposeInMainWorld("shellscope", api);
