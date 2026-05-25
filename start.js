#!/usr/bin/env node

console.log("[App] Starting EduGest-PIM...");

// Start backend (Fastify on port 3000)
const backendProcess = require("./apps/api/dist/server.js");

// Start frontend (Next.js on port 3001)
console.log("[App] Starting Next.js frontend...");
const { spawn } = require("child_process");
const nextProcess = spawn("node", [
  "apps/web/node_modules/.bin/next",
  "start",
  "-p", "3001"
], {
  cwd: process.cwd(),
  stdio: "inherit"
});

// Handle shutdown gracefully
process.on("SIGTERM", () => {
  console.log("[App] Shutting down...");
  nextProcess.kill();
  process.exit(0);
});
