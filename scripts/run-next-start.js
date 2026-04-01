const { spawn } = require("node:child_process");

const port = (process.env.PORT || "").trim() || "3009";

const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", "-p", port],
  {
    stdio: "inherit",
    env: process.env,
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
