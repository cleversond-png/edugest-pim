#!/usr/bin/env node

const { spawn } = require("child_process");

console.log("[App] Starting EduGest-PIM...");

// Start backend API (Fastify on port 3000)
console.log("[App] Starting API on port 3000...");
const apiProcess = spawn("node", ["./apps/api/dist/server.js"], {
  env: { ...process.env, PORT: "3000" },
  stdio: "inherit"
});

// Handle shutdown gracefully
process.on("SIGTERM", () => {
  console.log("[App] Shutting down gracefully...");
  apiProcess.kill();
  process.exit(0);
});
