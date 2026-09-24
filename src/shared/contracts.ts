import { z } from "zod";

export const SeveritySchema = z.enum(["critical", "warning", "info"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const PathScopeSchema = z.enum(["user", "machine", "process"]);
export type PathScope = z.infer<typeof PathScopeSchema>;

export const PathEntrySchema = z.object({
  scope: PathScopeSchema,
  index: z.number().int().nonnegative(),
  raw: z.string(),
  normalized: z.string(),
  exists: z.boolean(),
  duplicateOf: z.number().int().nonnegative().nullable(),
});
export type PathEntry = z.infer<typeof PathEntrySchema>;

export const ToolCandidateSchema = z.object({
  path: z.string(),
  version: z.string().nullable(),
  kind: z.string(),
  precedence: z.number().int().positive(),
  runtimeVersion: z.string().nullable().optional(),
  runtimeCompatible: z.boolean().nullable().optional(),
});
export type ToolCandidate = z.infer<typeof ToolCandidateSchema>;

export const ShellInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  available: z.boolean(),
  executable: z.string().nullable(),
  version: z.string().nullable(),
  candidates: z.array(ToolCandidateSchema),
});
export type ShellInfo = z.infer<typeof ShellInfoSchema>;

export const PythonRuntimeSchema = z.object({
  key: z.string(),
  version: z.string(),
  variant: z.enum(["default", "freethreaded"]),
  implementation: z.string(),
  path: z.string(),
  symlink: z.string().nullable(),
  managed: z.boolean(),
});
export type PythonRuntime = z.infer<typeof PythonRuntimeSchema>;

export const WslDistributionSchema = z.object({
  name: z.string(),
  managed: z.boolean(),
  available: z.boolean(),
  error: z.string().nullable(),
  shells: z.array(ShellInfoSchema),
  pythonRuntimes: z.array(PythonRuntimeSchema),
});
export type WslDistribution = z.infer<typeof WslDistributionSchema>;

export const SystemSnapshotSchema = z.object({
  scannedAt: z.iso.datetime(),
  computerName: z.string(),
  os: z.string(),
  architecture: z.string(),
  homeDirectory: z.string(),
  userPath: z.string(),
  machinePath: z.string(),
  processPath: z.string(),
  pathExt: z.string(),
  shells: z.array(ShellInfoSchema),
  pythonRuntimes: z.array(PythonRuntimeSchema),
  wslDistributions: z.array(WslDistributionSchema),
});
export type SystemSnapshot = z.infer<typeof SystemSnapshotSchema>;

export const IssueSchema = z.object({
  id: z.string(),
  severity: SeveritySchema,
  scope: PathScopeSchema.optional(),
  title: z.string(),
  explanation: z.string(),
  evidence: z.string(),
  repairable: z.boolean(),
  entryIndex: z.number().int().nonnegative().optional(),
});
export type Issue = z.infer<typeof IssueSchema>;

export const DiagnosticReportSchema = z.object({
  snapshot: SystemSnapshotSchema,
  entries: z.array(PathEntrySchema),
  issues: z.array(IssueSchema),
  score: z.number().int().min(0).max(100),
});
export type DiagnosticReport = z.infer<typeof DiagnosticReportSchema>;

export const RepairPreviewSchema = z.object({
  issueId: z.string(),
  before: z.string(),
  after: z.string(),
  removed: z.array(z.string()),
  scope: z.literal("user"),
});
export type RepairPreview = z.infer<typeof RepairPreviewSchema>;

export const RepairResultSchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    backupPath: z.string(),
    report: DiagnosticReportSchema,
  }),
  z.object({ ok: z.literal(false), message: z.string() }),
]);
export type RepairResult = z.infer<typeof RepairResultSchema>;

export const CodexInsightSchema = z.object({
  summary: z.string(),
  risks: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type CodexInsight = z.infer<typeof CodexInsightSchema>;

export const ProjectKindSchema = z.enum([
  "codex",
  "static-web",
  "node",
  "python-uv",
  "docker-node",
]);
export type ProjectKind = z.infer<typeof ProjectKindSchema>;

export const ProjectRequestSchema = z.object({
  basePath: z.string().min(1),
  name: z.string().regex(/^[a-z0-9][a-z0-9._-]{1,63}$/u, "Nom invalide"),
  kind: ProjectKindSchema,
});
export type ProjectRequest = z.infer<typeof ProjectRequestSchema>;

export const ProjectPlanSchema = z.object({
  request: ProjectRequestSchema,
  targetPath: z.string(),
  files: z.array(z.object({ relativePath: z.string(), purpose: z.string() })),
  commands: z.array(z.string()),
  environment: z.enum(["windows", "wsl"]),
  ready: z.boolean(),
  blocker: z.string().nullable(),
});
export type ProjectPlan = z.infer<typeof ProjectPlanSchema>;

export const ProjectCreateResultSchema = z.object({
  ok: z.boolean(),
  targetPath: z.string(),
  message: z.string(),
});
export type ProjectCreateResult = z.infer<typeof ProjectCreateResultSchema>;

export interface ShellScopeApi {
  readonly scan: () => Promise<DiagnosticReport>;
  readonly previewRepair: (issueId: string) => Promise<RepairPreview>;
  readonly applyRepair: (preview: RepairPreview) => Promise<RepairResult>;
  readonly askCodex: (report: DiagnosticReport) => Promise<CodexInsight>;
  readonly previewProject: (request: ProjectRequest) => Promise<ProjectPlan>;
  readonly createProject: (
    request: ProjectRequest,
  ) => Promise<ProjectCreateResult>;
}
