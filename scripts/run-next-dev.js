const { spawn } = require("node:child_process");

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

const port = readCliOption("port") || (process.env.PORT || "").trim() || "3009";
const hostname =
  readCliOption("hostname") || readCliOption("host") || (process.env.HOSTNAME || "").trim();

const child = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "dev",
    "-p",
    port,
    ...(hostname ? ["-H", hostname] : []),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      BRANDOPS_DIST_DIR: (process.env.BRANDOPS_DIST_DIR || "").trim() || ".next-dev",
    },
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code || 0);
});
