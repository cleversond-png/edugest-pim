#!/usr/bin/env node

console.log("[App] Starting EduGest-PIM API...");

// Start backend (Fastify on port 3000)
// The API handles both the REST endpoints and serves the Next.js frontend via reverse proxy
require("./apps/api/dist/server.js");
