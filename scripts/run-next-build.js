const { spawn } = require("node:child_process");

function runBuild() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
      env: {
        ...process.env,
        BRANDOPS_DIST_DIR: (process.env.BRANDOPS_DIST_DIR || "").trim() || ".next",
        BRANDOPS_OUTPUT_MODE: (process.env.BRANDOPS_OUTPUT_MODE || "").trim() || "standalone",
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
