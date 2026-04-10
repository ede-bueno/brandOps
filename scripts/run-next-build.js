const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function cleanupReservedPublicNextFolder() {
  const reservedPath = path.join(process.cwd(), "public", "_next");
  if (fs.existsSync(reservedPath)) {
    fs.rmSync(reservedPath, { recursive: true, force: true });
  }
}

function cleanupDistDir() {
  const distDir = (process.env.BRANDOPS_DIST_DIR || "").trim() || ".next";
  const distPath = path.join(process.cwd(), distDir);
  if (fs.existsSync(distPath)) {
    fs.rmSync(distPath, { recursive: true, force: true });
  }
}

function runBuild() {
  cleanupReservedPublicNextFolder();
  cleanupDistDir();

  const isVercelBuild = Boolean((process.env.VERCEL || "").trim());
  const distDir = isVercelBuild
    ? ((process.env.BRANDOPS_DIST_DIR || "").trim() || ".next")
    : ((process.env.BRANDOPS_DIST_DIR || "").trim() || ".next-build");
  const outputMode = isVercelBuild
    ? ((process.env.BRANDOPS_OUTPUT_MODE || "").trim() || "")
    : ((process.env.BRANDOPS_OUTPUT_MODE || "").trim() || "standalone");

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
      env: {
        ...process.env,
        BRANDOPS_DIST_DIR: distDir,
        BRANDOPS_OUTPUT_MODE: outputMode,
      },
      stdio: ["inherit", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));

    child.on("exit", (code, signal) => {
      resolve({ code: code ?? 0, signal });
    });
  });
}

(async () => {
  const firstRun = await runBuild();
  if (firstRun.signal) {
    process.kill(process.pid, firstRun.signal);
    return;
  }

  if (firstRun.code === 0) {
    process.exit(0);
  }

  process.stderr.write(
    "\n[brandops] Primeira execução do next build falhou. Reexecutando automaticamente uma vez...\n",
  );

  const secondRun = await runBuild();
  if (secondRun.signal) {
    process.kill(process.pid, secondRun.signal);
    return;
  }

  process.exit(secondRun.code);
})();
