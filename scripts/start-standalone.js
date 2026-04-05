const { cpSync, existsSync, mkdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { spawn } = require("node:child_process");

const projectRoot = join(__dirname, "..");
const distDir = (process.env.BRANDOPS_DIST_DIR || "").trim() || ".next";

const sourceStatic = join(projectRoot, distDir, "static");
const sourceStandalone = join(projectRoot, distDir, "standalone");
const targetStatic = join(sourceStandalone, ".next", "static");
const sourcePublic = join(projectRoot, "public");
const targetPublic = join(sourceStandalone, "public");
const serverEntrypoint = join(sourceStandalone, "server.js");
const envFilePath = join(projectRoot, ".env.local");

function readCliOption(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) {
    return inline.slice(prefix.length).trim();
  }

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) {
    const value = process.argv[index + 1];
    if (value && !value.startsWith("--")) {
      return value.trim();
    }
  }

  return "";
}

function loadLocalEnvFile() {
  if (!existsSync(envFilePath)) {
    return;
  }

  const content = readFileSync(envFilePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function ensureDirectory(path) {
  mkdirSync(path, { recursive: true });
}

function syncDirectory(source, target) {
  if (!existsSync(source)) {
    return;
  }

  ensureDirectory(target);
  cpSync(source, target, { recursive: true, force: true });
}

function resolveStartMode() {
  if (existsSync(serverEntrypoint)) {
    return "standalone";
  }

  return "next-dev";
}

function buildSpawnConfig(mode) {
  const port = (process.env.PORT || "").trim();
  const hostname = (process.env.HOSTNAME || "").trim();
  const nextCliArgs = [
    ...(port ? ["-p", port] : []),
    ...(hostname ? ["-H", hostname] : []),
  ];

  if (mode === "standalone") {
    syncDirectory(sourceStatic, targetStatic);
    syncDirectory(sourcePublic, targetPublic);

    return {
      command: process.execPath,
      args: [serverEntrypoint],
      cwd: sourceStandalone,
    };
  }

  return {
    command: process.execPath,
    args: [require.resolve("next/dist/bin/next"), "dev", ...nextCliArgs],
    cwd: projectRoot,
  };
}

loadLocalEnvFile();

const requestedPort = readCliOption("port");
const requestedHostname = readCliOption("hostname") || readCliOption("host");
const shouldDetach = process.env.BRANDOPS_DETACHED === "1";

if (requestedPort) {
  process.env.PORT = requestedPort;
}

if (requestedHostname) {
  process.env.HOSTNAME = requestedHostname;
}

const mode = resolveStartMode();
const spawnConfig = buildSpawnConfig(mode);

if (mode !== "standalone") {
  process.stdout.write(
    "[brandops] saída standalone indisponível. Iniciando em modo next dev.\n",
  );
}

const child = spawn(spawnConfig.command, spawnConfig.args, {
  cwd: spawnConfig.cwd,
  stdio: shouldDetach ? "ignore" : "inherit",
  env: process.env,
  detached: shouldDetach,
});

child.on("error", (error) => {
  process.stderr.write(`[brandops] falha ao iniciar o servidor: ${error.message}\n`);
  process.exit(1);
});

if (shouldDetach) {
  child.unref();
  process.exit(0);
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
