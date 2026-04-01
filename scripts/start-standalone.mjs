import { cpSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

const sourceStatic = join(projectRoot, ".next", "static");
const targetStatic = join(projectRoot, ".next", "standalone", ".next", "static");
const sourcePublic = join(projectRoot, "public");
const targetPublic = join(projectRoot, ".next", "standalone", "public");
const serverEntrypoint = join(projectRoot, ".next", "standalone", "server.js");
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
      (value.startsWith('"') && value.endsWith('"')) ||
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
  cwd: join(projectRoot, ".next", "standalone"),
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
