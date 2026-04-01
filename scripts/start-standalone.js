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

syncDirectory(sourceStatic, targetStatic);
syncDirectory(sourcePublic, targetPublic);
loadLocalEnvFile();

const child = spawn(process.execPath, [serverEntrypoint], {
  cwd: sourceStandalone,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
