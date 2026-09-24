import { spawn } from "node:child_process";

type RunOptions = {
  readonly input: string;
  readonly timeout: number;
};

export const runWithInput = (
  executable: string,
  args: readonly string[],
  options: RunOptions,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), options.timeout);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else
        reject(
          new Error(
            stderr.trim() ||
              `${executable} a quitté avec le code ${code ?? "inconnu"}.`,
          ),
        );
    });
    child.stdin.end(options.input);
  });
