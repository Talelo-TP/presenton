/* start.js - Final Production Version */
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastapiDir = join(__dirname, "servers/fastapi");
const nextjsDir = join(__dirname, "servers/nextjs");

const args = process.argv.slice(2);

// Ensure App Data exists
const userConfigPath = join(process.env.APP_DATA_DIRECTORY || "/tmp", "userConfig.json");
const userDataDir = dirname(userConfigPath);
if (!existsSync(userDataDir)) mkdirSync(userDataDir, { recursive: true });

// Minimal Config
writeFileSync(userConfigPath, JSON.stringify({
  LLM: "google",
  GOOGLE_MODEL: "gemini-1.5-pro",
  IMAGE_PROVIDER: "pexels"
}));

const startServers = async () => {
  console.log("🚀 Starting Presenton Services...");

  // 1. FastAPI (Port 8000)
  const fastApiProcess = spawn("python3", ["server.py", "--port", "8000", "--reload", "false"], {
    cwd: fastapiDir,
    stdio: "inherit",
    // CRITICAL: Bind to 0.0.0.0 so 127.0.0.1 works
    env: { ...process.env, HOST: "0.0.0.0" } 
  });

  // 2. MCP Server (Port 8001)
  const appmcpProcess = spawn("python3", ["mcp_server.py", "--port", "8001"], {
    cwd: fastapiDir,
    stdio: "inherit",
    env: process.env
  });

  // 3. Next.js (Port 3000)
  const nextjsProcess = spawn("npm", ["run", "start", "--", "-H", "0.0.0.0", "-p", "3000"], {
    cwd: nextjsDir,
    stdio: "inherit",
    env: process.env
  });

  // 4. Nginx (Port 8080)
  console.log("📡 Starting Nginx (Listening on 8080)...");
  const nginxProcess = spawn("nginx", ["-g", "daemon off;"], {
    stdio: "inherit",
    env: process.env
  });

  // Error Handlers
  fastApiProcess.on("error", (e) => console.error("❌ FastAPI Error:", e));
  nextjsProcess.on("error", (e) => console.error("❌ NextJS Error:", e));
  nginxProcess.on("error", (e) => console.error("❌ Nginx Error:", e));

  const exitCode = await Promise.race([
    new Promise(r => fastApiProcess.on("exit", r)),
    new Promise(r => nginxProcess.on("exit", r)),
  ]);

  process.exit(exitCode);
};

startServers();
