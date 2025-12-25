import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastapiDir = join(__dirname, "servers/fastapi");
const nextjsDir = join(__dirname, "servers/nextjs");

const appDataDirectory = process.env.APP_DATA_DIRECTORY || "/tmp/app_data";
process.env.APP_DATA_DIRECTORY = appDataDirectory;
process.env.USER_CONFIG_PATH =
  process.env.USER_CONFIG_PATH || join(appDataDirectory, "userConfig.json");
process.env.TEMP_DIRECTORY = process.env.TEMP_DIRECTORY || "/tmp/presenton";
process.env.CAN_CHANGE_KEYS = process.env.CAN_CHANGE_KEYS || "false";

// Set up App Data for Cloud Run /tmp
const userConfigPath = process.env.USER_CONFIG_PATH;
const userDataDir = dirname(userConfigPath);
if (!existsSync(userDataDir)) mkdirSync(userDataDir, { recursive: true });

// Pre-fill config so frontend doesn't hang on setup
writeFileSync(userConfigPath, JSON.stringify({
  LLM: process.env.LLM || "google",
  GOOGLE_MODEL: process.env.GOOGLE_MODEL || "models/gemini-2.5-flash",
  IMAGE_PROVIDER: process.env.IMAGE_PROVIDER || "gemini_flash",
  CAN_CHANGE_KEYS: process.env.CAN_CHANGE_KEYS
}));

const startServices = async () => {
  console.log("🚀 Starting Presenton Backend...");

  const venvPython = existsSync(join(fastapiDir, ".venv", "bin", "python"))
    ? join(fastapiDir, ".venv", "bin", "python")
    : "python3";

  // 1. Start FastAPI
  const fastApiProcess = spawn(venvPython, ["server.py", "--port", "8000"], {
    cwd: fastapiDir,
    stdio: "inherit",
    env: { ...process.env, HOST: "127.0.0.1" }
  });

  // 2. Start MCP
  spawn(venvPython, ["mcp_server.py", "--port", "8001"], {
    cwd: fastapiDir,
    stdio: "inherit"
  });

  console.log("🚀 Starting Presenton Frontend...");
  // 3. Start Next.js (Force 127.0.0.1 to match Nginx)
  const nextjsProcess = spawn("npm", ["run", "start", "--", "-p", "3000", "-H", "127.0.0.1"], {
    cwd: nextjsDir,
    stdio: "inherit"
  });

  // 4. THE FIX: Wait for apps to actually open their ports
  console.log("⏳ Staggering Nginx startup (15s) to prevent 502...");
  await new Promise(resolve => setTimeout(resolve, 15000));

  console.log("📡 Starting Nginx Gateway...");
  const nginxProcess = spawn("nginx", ["-g", "daemon off;"], {
    stdio: "inherit"
  });

  // Keep process alive
  fastApiProcess.on("exit", (code) => {
    console.error(`FastAPI exited with code ${code}`);
    process.exit(code);
  });
  
  nginxProcess.on("exit", (code) => {
    console.error(`Nginx exited with code ${code}`);
    process.exit(code);
  });
};

startServices().catch(err => {
  console.error("Startup failed:", err);
  process.exit(1);
});
