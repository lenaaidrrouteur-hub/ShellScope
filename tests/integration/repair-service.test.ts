import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { encodeSetEnvCommand } from "../../src/main/repair-service";

const execFileAsync = promisify(execFile);

describe.runIf(process.platform === "win32")(
  "encodeSetEnvCommand (réparation PATH)",
  () => {
    it("écrit, relit puis supprime une valeur hostile via -EncodedCommand", async () => {
      const scratchVariable = "SHELLSCOPE_TEST_PATH";
      const hostile =
        "C:\\Users\\demo\\AppData\\Local\\Programs\\Python\\Launcher;C:\\Program Files\\nodejs;C:'quoted' dir;$env:NOPE;(paren);C:\\Program Files\\Git\\cmd";
      const read = [
        "-NoProfile",
        "-Command",
        `[Environment]::GetEnvironmentVariable('${scratchVariable}','User')`,
      ];
      try {
        await execFileAsync(
          "powershell.exe",
          [
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-EncodedCommand",
            encodeSetEnvCommand(scratchVariable, hostile),
          ],
          { encoding: "utf8", timeout: 20_000, windowsHide: true },
        );
        const written = await execFileAsync("powershell.exe", read, {
          encoding: "utf8",
          timeout: 20_000,
          windowsHide: true,
        });
        expect(written.stdout.trim()).toBe(hostile);
      } finally {
        await execFileAsync(
          "powershell.exe",
          [
            "-NoProfile",
            "-NonInteractive",
            "-EncodedCommand",
            encodeSetEnvCommand(scratchVariable, ""),
          ],
          { encoding: "utf8", timeout: 20_000, windowsHide: true },
        );
      }
      const deleted = await execFileAsync("powershell.exe", read, {
        encoding: "utf8",
        timeout: 20_000,
        windowsHide: true,
      });
      expect(deleted.stdout.trim()).toBe("");
    }, 30_000);

    it("encode un payload décodable sans toucher au registre", () => {
      const decoded = Buffer.from(
        encodeSetEnvCommand("SHELLSCOPE_TEST_PATH", "a'b;C:\\Program Files"),
        "base64",
      ).toString("utf16le");
      expect(decoded).toBe(
        "[Environment]::SetEnvironmentVariable('SHELLSCOPE_TEST_PATH', 'a''b;C:\\Program Files', 'User')",
      );
    });
  },
);