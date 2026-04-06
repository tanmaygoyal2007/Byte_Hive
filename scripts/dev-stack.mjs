import fs from "node:fs"
import net from "node:net"
import path from "node:path"
import process from "node:process"
import { spawn, spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "..")
const isWindows = process.platform === "win32"
const firebaseCliPath = path.join(repoRoot, "node_modules", "firebase-tools", "lib", "bin", "firebase.js")
const pidFile = path.join(repoRoot, ".dev-stack-pids.json")
const firebaseConfigFile = path.join(repoRoot, ".firebase.dev-stack.json")
const localConfigHome = path.join(repoRoot, ".dev-home")

const defaultFrontendPort = 3101
const defaultBackendPort = 18010
const defaultFirebaseUiPort = 14100
const defaultFirestorePort = 18180
const defaultAuthPort = 19199

let runtimeBaseEnv = {
  ...process.env,
  XDG_CONFIG_HOME: localConfigHome,
  VITE_FIREBASE_API_KEY: "demo-api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "demo-bytehive.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "demo-bytehive",
  VITE_FIREBASE_APP_ID: "1:1234567890:web:demo-bytehive",
}

const children = []
let shuttingDown = false

function log(message) {
  process.stdout.write(`[frontend-dev] ${message}\n`)
}

function requireFile(filepath, description) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`${description} not found at ${filepath}`)
  }
}

function getNpmExecutable() {
  return isWindows ? "npm.cmd" : "npm"
}

function resolveSpawnCommand(command, args) {
  if (isWindows && command === getNpmExecutable()) {
    return {
      command: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", `${command} ${args.join(" ")}`],
    }
  }

  return { command, args }
}

function loadPidFile() {
  try {
    return JSON.parse(fs.readFileSync(pidFile, "utf8"))
  } catch {
    return []
  }
}

function writePidFile() {
  const records = children
    .filter(({ child }) => Number.isInteger(child.pid))
    .map(({ name, child }) => ({ name, pid: child.pid }))
  fs.writeFileSync(pidFile, `${JSON.stringify(records, null, 2)}\n`)
}

function removePidFile() {
  try {
    fs.unlinkSync(pidFile)
  } catch {
    // Ignore missing pid file during shutdown.
  }
}

function removeTempFirebaseConfig() {
  try {
    fs.unlinkSync(firebaseConfigFile)
  } catch {
    // Ignore missing temp config during shutdown.
  }
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function killProcessTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return

  if (isWindows) {
    spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" })
    return
  }

  try {
    process.kill(-pid, "SIGTERM")
  } catch {
    try {
      process.kill(pid, "SIGTERM")
    } catch {
      // Ignore processes that have already exited.
    }
  }
}

function cleanupPreviousRun() {
  const previousChildren = loadPidFile()
  if (previousChildren.length === 0) return

  for (const { pid, name } of previousChildren) {
    if (!isPidAlive(pid)) continue
    killProcessTree(pid)
    log(`Stopped previous ${name} process (pid ${pid})`)
  }

  removePidFile()
}

function startProcess(name, command, args, cwd, extraEnv = {}) {
  const resolved = resolveSpawnCommand(command, args)

  const child = spawn(resolved.command, resolved.args, {
    cwd,
    env: { ...runtimeBaseEnv, ...extraEnv },
    stdio: "inherit",
    detached: !isWindows,
  })

  child.on("error", (error) => {
    if (shuttingDown) return
    log(`${name} failed to start: ${error.message}`)
    shutdown(1)
  })

  child.on("exit", (code, signal) => {
    if (shuttingDown) return
    const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`
    log(`${name} exited with ${detail}`)
    shutdown(code ?? 0)
  })

  children.push({ name, child })
  writePidFile()
  return child
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.unref()
    server.on("error", () => resolve(false))
    server.listen({ host: "127.0.0.1", port }, () => {
      server.close(() => resolve(true))
    })
  })
}

async function findAvailablePort(startPort) {
  for (let port = startPort; port < startPort + 200; port += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(port)) {
      return port
    }
  }

  throw new Error(`No free port found starting at ${startPort}`)
}

function writeFirebaseConfig({ authPort, firestorePort, firebaseUiPort }) {
  fs.mkdirSync(localConfigHome, { recursive: true })
  fs.writeFileSync(
    firebaseConfigFile,
    `${JSON.stringify(
      {
        emulators: {
          auth: {
            host: "127.0.0.1",
            port: authPort,
          },
          firestore: {
            host: "127.0.0.1",
            port: firestorePort,
          },
          ui: {
            enabled: true,
            host: "127.0.0.1",
            port: firebaseUiPort,
          },
        },
      },
      null,
      2,
    )}\n`,
  )
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  log("Stopping frontend, backend, and Firebase emulators...")
  removePidFile()
  removeTempFirebaseConfig()

  for (const { child } of children) {
    if (child.pid) {
      killProcessTree(child.pid)
    }
  }

  setTimeout(() => {
    process.exit(exitCode)
  }, 1500)
}

process.on("SIGINT", () => shutdown(0))
process.on("SIGTERM", () => shutdown(0))
process.on("exit", () => {
  removePidFile()
  removeTempFirebaseConfig()
})

async function main() {
  requireFile(firebaseCliPath, "Firebase CLI")
  cleanupPreviousRun()

  const frontendPort = await findAvailablePort(defaultFrontendPort)
  const backendPort = await findAvailablePort(defaultBackendPort)
  const firebaseUiPort = await findAvailablePort(defaultFirebaseUiPort)
  const firestorePort = await findAvailablePort(defaultFirestorePort)
  const authPort = await findAvailablePort(defaultAuthPort)
  const frontendOrigin = `http://localhost:${frontendPort}`
  const backendOrigin = `http://127.0.0.1:${backendPort}`
  const npmExecutable = getNpmExecutable()

  runtimeBaseEnv = {
    ...runtimeBaseEnv,
    FIREBASE_PROJECT_ID: "demo-bytehive",
    FIRESTORE_EMULATOR_HOST: `127.0.0.1:${firestorePort}`,
    FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${authPort}`,
    VITE_FIREBASE_AUTH_EMULATOR: "true",
    VITE_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1",
    VITE_FIREBASE_AUTH_EMULATOR_PORT: String(authPort),
    VITE_FIREBASE_FIRESTORE_EMULATOR: "true",
    VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: "127.0.0.1",
    VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: String(firestorePort),
  }

  writeFirebaseConfig({ authPort, firestorePort, firebaseUiPort })

  log("Starting Firebase emulators...")
  startProcess(
    "firebase",
    process.execPath,
    [
      firebaseCliPath,
      "emulators:start",
      "--only",
      "auth,firestore",
      "--config",
      firebaseConfigFile,
      "--project",
      "demo-bytehive",
    ],
    repoRoot,
  )

  log("Starting backend...")
  startProcess(
    "backend",
    npmExecutable,
    ["--prefix", "backend", "run", "dev", "--", "--hostname", "127.0.0.1", "--port", String(backendPort)],
    repoRoot,
    {
      FRONTEND_ORIGIN: frontendOrigin,
      NEXT_PUBLIC_FRONTEND_ORIGIN: frontendOrigin,
      NEXT_PUBLIC_BACKEND_URL: backendOrigin,
    },
  )

  log("Starting frontend...")
  startProcess(
    "frontend",
    npmExecutable,
    ["--prefix", "frontend", "run", "dev", "--", "--host", "127.0.0.1", "--port", String(frontendPort)],
    repoRoot,
    {
      VITE_BACKEND_URL: backendOrigin,
    },
  )

  log(`Frontend: ${frontendOrigin}`)
  log(`Backend: ${backendOrigin}`)
  log(`Firebase UI: http://127.0.0.1:${firebaseUiPort}`)
}

main().catch((error) => {
  log(error instanceof Error ? error.message : "Failed to start local stack.")
  shutdown(1)
})
