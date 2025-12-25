/* Optimized Presenton Orchestrator for Cloud Run */
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastapiDir = join(__dirname, "servers/fastapi");
const nextjsDir = join(__dirname, "servers/nextjs");

// Internal ports (Not exposed publicly, only to Nginx)
const fastapiPort = 8000;
const nextjsPort = 3000;
const appmcpPort = 8001;

// Setup App Data Directory (Cloud Run uses /tmp usually)
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

  // Force Google config as requested
  const userConfig = {
    LLM: process.env.LLM || "google",
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || existingConfig.GOOGLE_API_KEY,
    GOOGLE_MODEL: process.env.GOOGLE_MODEL || "gemini-1.5-pro",
    PEXELS_API_KEY: process.env.PEXELS_API_KEY || existingConfig.PEXELS_API_KEY,
    IMAGE_PROVIDER: process.env.IMAGE_PROVIDER || "pexels",
    CAN_CHANGE_KEYS: "false"
  };

  writeFileSync(userConfigPath, JSON.stringify(userConfig));
};

const startServers = async () => {
  console.log("🚀 Starting Presenton Services...");

  // 1. Start FastAPI (Backend) - Using python3
  const fastApiProcess = spawn(
    "python3",
    ["server.py", "--port", fastapiPort.toString(), "--reload", "false"],
    {
      cwd: fastapiDir,
      stdio: "inherit",
      env: { ...process.env, HOST: "0.0.0.0" },
    }
  );

  // 2. Start MCP Server - Using python3
  const appmcpProcess = spawn(
    "python3",
    ["mcp_server.py", "--port", appmcpPort.toString()],
    {
      cwd: fastapiDir,
      stdio: "inherit",
      env: process.env,
    }
  );

  // 3. Start Next.js (Frontend)
  const nextjsProcess = spawn(
    "npm",
    ["run", "start", "--", "-H", "0.0.0.0", "-p", nextjsPort.toString()],
    {
      cwd: nextjsDir,
      stdio: "inherit",
      env: process.env,
    }
  );

  // 4. Start Nginx (The Router)
  console.log("📡 Starting Nginx on Port 8080...");
  const nginxProcess = spawn("nginx", ["-g", "daemon off;"], {
    stdio: "inherit",
    env: process.env,
  });

  // Log failures
  fastApiProcess.on("error", (err) => console.error("❌ FastAPI failed:", err));
  nextjsProcess.on("error", (err) => console.error("❌ Next.js failed:", err));
  nginxProcess.on("error", (err) => console.error("❌ Nginx failed:", err));

  const exitCode = await Promise.race([
    new Promise((resolve) => fastApiProcess.on("exit", resolve)),
    new Promise((resolve) => nextjsProcess.on("exit", resolve)),
    new Promise((resolve) => nginxProcess.on("exit", resolve)),
  ]);

  console.log(`Process exited with code: ${exitCode}`);
  process.exit(exitCode);
};

const main = async () => {
  setupUserConfigFromEnv();
  startServers();
};

main();
