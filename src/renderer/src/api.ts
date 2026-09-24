import type { ShellScopeApi } from "../../shared/contracts";
import { createBrowserApi } from "./browser-api";

export const shellScopeApi: ShellScopeApi =
  window.shellscope ?? createBrowserApi();
