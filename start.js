#!/usr/bin/env node

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("[App] === STARTUP BEGIN ===");
console.log("[App] Time:", new Date().toISOString());
console.log("[App] CWD:", process.cwd());
console.log("[App] NODE_ENV:", process.env.NODE_ENV);
console.log("[App] PORT:", process.env.PORT || "3000");
console.log("[App] Platform:", process.platform);
console.log("[App] Node version:", process.version);

// Check if API server file exists
const serverPath = "./apps/api/dist/server.js";
const serverExists = fs.existsSync(serverPath);
console.log(`[App] Server file exists (${serverPath}):`, serverExists);

if (serverExists) {
  const stats = fs.statSync(serverPath);
  console.log(`[App] Server file size:`, stats.size, "bytes");
}

// Check frontend files
const frontendPath = "./apps/api/public";
const frontendExists = fs.existsSync(frontendPath);
console.log(`[App] Frontend folder exists (${frontendPath}):`, frontendExists);

if (frontendExists) {
  try {
    const files = fs.readdirSync(frontendPath);
    console.log(`[App] Frontend files count:`, files.length);
    console.log(`[App] Frontend files:`, files.slice(0, 10).join(", "));
  } catch (err) {
    console.log(`[App] Error reading frontend folder:`, err.message);
  }
}

// Apply Prisma schema to the database (idempotent). Runs from inside the
// container, whose network can reach the Azure PostgreSQL server.
if (process.env.DATABASE_URL) {
  try {
    console.log("[App] Applying Prisma schema (db push)...");
    execSync("npx prisma db push --schema=./schema.prisma --skip-generate --accept-data-loss", {
      stdio: "inherit",
    });
    console.log("[App] Prisma schema applied.");

    // Seed catalog on first boot only (idempotent: skip if products exist).
    try {
      const count = execSync(
        "node -e \"const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.product.count().then(c=>{process.stdout.write(String(c));return p.$disconnect()}).catch(()=>{process.stdout.write('-1')})\""
      ).toString().trim();
      if (count === "0") {
        console.log("[App] Empty catalog detected, seeding...");
        execSync("npx ts-node seed.ts", { stdio: "inherit" });
        console.log("[App] Seed complete.");
      } else {
        console.log(`[App] Catalog has ${count} products, skipping seed.`);
      }
    } catch (err) {
      console.error("[App] seed check failed (continuing):", err.message);
    }
  } catch (err) {
    console.error("[App] prisma db push failed (continuing):", err.message);
  }
} else {
  console.log("[App] DATABASE_URL not set, skipping db push.");
}

console.log("[App] Starting API on port 3000...");

const apiProcess = spawn("node", ["./apps/api/dist/server.js"], {
  env: { ...process.env, PORT: "3000" },
  stdio: "inherit"
});

apiProcess.on("error", (err) => {
  console.error("[App] Failed to start server process:", err);
  process.exit(1);
});

apiProcess.on("exit", (code, signal) => {
  console.log(`[App] Server process exited with code ${code} and signal ${signal}`);
  process.exit(code || 1);
});

// Handle shutdown gracefully
process.on("SIGTERM", () => {
  console.log("[App] Received SIGTERM, shutting down gracefully...");
  apiProcess.kill();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[App] Received SIGINT, shutting down gracefully...");
  apiProcess.kill();
  process.exit(0);
});
