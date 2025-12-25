/* Optimized for Google Cloud Run Deployment */
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastapiDir = join(__dirname, "servers/fastapi");
const nextjsDir = join(__dirname, "servers/nextjs");

const args = process.argv.slice(2);
const hasDevArg = args.includes("--dev") || args.includes("-d");
const isDev = hasDevArg;
const canChangeKeys = process.env.CAN_CHANGE_KEYS !== "false";

const fastapiPort = 8000;
const nextjsPort = 3000;
const appmcpPort = 8001;

// Cloud Run requires /tmp or a mounted volume for writes
const userConfigPath = join(process.env.APP_DATA_DIRECTORY || "/tmp", "userConfig.json");
const userDataDir = dirname(userConfigPath);

if (!existsSync(userDataDir)) {
  mkdirSync(userDataDir, { recursive: true });
}

process.env.USER_CONFIG_PATH = userConfigPath;

const setupUserConfigFromEnv = () => {
  let existingConfig = {};
  if (existsSync(userConfigPath)) {
    try {
      existingConfig = JSON.parse(readFileSync(userConfigPath, "utf8"));
    } catch (e) {
      existingConfig = {};
    }
  }

  const userConfig = {
    LLM: process.env.LLM || "google", // Default to google as per your requirement
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || existingConfig.GOOGLE_API_KEY,
    GOOGLE_MODEL: process.env.GOOGLE_MODEL || existingConfig.GOOGLE_MODEL || "gemini-1.5-pro",
    PEXELS_API_KEY: process.env.PEXELS_API_KEY || existingConfig.PEXELS_API_KEY,
    IMAGE_PROVIDER: process.env.IMAGE_PROVIDER || "pexels",
    CAN_CHANGE_KEYS: "false" // Lock config in Cloud Run
  };

  writeFileSync(userConfigPath, JSON.stringify(userConfig));
};

const startServers = async () => {
  // 1. Start FastAPI (Backend) - Changed to python3 for GCP compatibility
  const fastApiProcess = spawn(
    "python3",
    [
      "server.py",
      "--port",
      fastapiPort.toString(),
      "--reload",
      "false",
    ],
    {
      cwd: fastapiDir,
      stdio: "inherit",
      env: { ...process.env, HOST: "0.0.0.0" },
    }
  );

  fastApiProcess.on("error", (err) => {
    console.error("FastAPI process failed to start:", err);
  });

  // 2. Start MCP Server
  const appmcpProcess = spawn(
    "python3",
    ["mcp_server.py", "--port", appmcpPort.toString()],
    {
      cwd: fastapiDir,
      stdio: "inherit", // Changed to inherit so we can see MCP errors in logs
      env: process.env,
    }
  );

  // 3. Start Next.js (Frontend)
  const nextjsProcess = spawn(
    "npm",
    [
      "run",
      "start",
      "--",
      "-H",
      "0.0.0.0",
      "-p",
      nextjsPort.toString(),
    ],
    {
      cwd: nextjsDir,
      stdio: "inherit",
      env: process.env,
    }
  );

  // OLLAMA REMOVED - Not needed for Google API

  const exitCode = await Promise.race([
    new Promise((resolve) => fastApiProcess.on("exit", resolve)),
    new Promise((resolve) => nextjsProcess.on("exit", resolve)),
  ]);

  console.log(`Critical process exited with code: ${exitCode}`);
  process.exit(exitCode);
};

// Start nginx directly (GCP doesn't support 'service nginx start')
const startNginx = () => {
  const nginxProcess = spawn("nginx", ["-g", "daemon off;"], {
    stdio: "inherit",
    env: process.env,
  });

  nginxProcess.on("error", (err) => {
    console.error("Nginx failed to start:", err);
  });
};

const main = async () => {
  if (canChangeKeys) {
    setupUserConfigFromEnv();
  }

  startNginx();
  startServers();
};

main();
