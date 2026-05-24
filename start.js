#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");

const port = process.env.PORT || 3000;

// Start backend on port 3000
const backend = spawn("node", ["apps/api/dist/server.js"], {
  cwd: __dirname,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: "3000",
  },
});

// Wait a bit then start frontend
setTimeout(() => {
  const frontend = spawn("node", ["apps/web/node_modules/.bin/next", "start", "-p", "3001"], {
    cwd: __dirname,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
  });

  frontend.on("exit", (code) => {
    console.error("Frontend exited with code", code);
    process.exit(code);
  });
}, 2000);

backend.on("exit", (code) => {
  console.error("Backend exited with code", code);
  process.exit(code);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  backend.kill("SIGTERM");
  setTimeout(() => process.exit(0), 5000);
});
