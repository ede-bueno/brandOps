const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function cleanDistDir() {
  fs.rmSync(path.resolve(process.cwd(), ".next"), {
    recursive: true,
    force: true,
  });
}

function runBuild() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
      env: process.env,
      stdio: "inherit",
    });

    child.on("exit", (code, signal) => {
      resolve({ code: code ?? 0, signal });
    });
  });
}

(async () => {
  cleanDistDir();
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

  cleanDistDir();
  const secondRun = await runBuild();
  if (secondRun.signal) {
    process.kill(process.pid, secondRun.signal);
    return;
  }

  process.exit(secondRun.code);
})();
