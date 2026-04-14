import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const shellCommand = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : npmCommand;

function startProcess(name: string, args: string[], cwd: string): ChildProcess {
  const childArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `${npmCommand} ${args.join(" ")}`]
      : args;

  const child = spawn(shellCommand, childArgs, {
    cwd: resolve(process.cwd(), cwd),
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${name}] stopped with signal ${signal}`);
      return;
    }

    if (typeof code === "number" && code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      shutdown(code);
    }
  });

  child.on("error", (error) => {
    console.error(`[${name}] failed to start`, error);
    shutdown(1);
  });

  return child;
}

const children = [startProcess("app", ["run", "dev"], ".")];

console.log("");
console.log("ByteHive Next.js dev server is starting...");
console.log("App: http://localhost:3000");
console.log("");

let isShuttingDown = false;

function shutdown(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }

  setTimeout(() => process.exit(exitCode), 150);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
