import type { ShellScopeApi } from "../../shared/contracts";

declare global {
  interface Window {
    readonly shellscope?: ShellScopeApi;
  }
}
