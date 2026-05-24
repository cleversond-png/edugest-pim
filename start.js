#!/usr/bin/env node

const http = require("http");
const path = require("path");
const { spawn } = require("child_process");

const port = process.env.PORT || 3000;

// Start backend on port 3010
const backendPort = 3010;
console.log(`[Main] Starting backend on port ${backendPort}...`);

const backend = spawn("node", ["apps/api/dist/server.js"], {
  cwd: __dirname,
  stdio: "pipe",
  env: {
    ...process.env,
    NODE_ENV: "production",
    PORT: backendPort.toString(),
  },
});

backend.stdout.on("data", (data) => {
  console.log(`[Backend] ${data}`);
});

backend.stderr.on("data", (data) => {
  console.error(`[Backend Error] ${data}`);
});

backend.on("error", (err) => {
  console.error("[Backend] Error:", err);
});

backend.on("exit", (code) => {
  console.error(`[Backend] Exited with code ${code}`);
  process.exit(1);
});

// Start frontend on port 3011
setTimeout(() => {
  const frontendPort = 3011;
  console.log(`[Main] Starting frontend on port ${frontendPort}...`);

  const frontend = spawn("node", ["apps/web/node_modules/.bin/next", "start", "-p", frontendPort.toString()], {
    cwd: __dirname,
    stdio: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
  });

  frontend.stdout.on("data", (data) => {
    console.log(`[Frontend] ${data}`);
  });

  frontend.stderr.on("data", (data) => {
    console.error(`[Frontend Error] ${data}`);
  });

  frontend.on("error", (err) => {
    console.error("[Frontend] Error:", err);
  });

  frontend.on("exit", (code) => {
    console.error(`[Frontend] Exited with code ${code}`);
    process.exit(1);
  });

  // Create proxy server
  setTimeout(() => {
    console.log(`[Main] Starting proxy on port ${port}...`);

    const server = http.createServer((req, res) => {
      // Route /api* to backend
      if (req.url.startsWith("/api")) {
        const backendReq = http.request(
          {
            hostname: "localhost",
            port: backendPort,
            path: req.url,
            method: req.method,
            headers: req.headers,
          },
          (backendRes) => {
            res.writeHead(backendRes.statusCode, backendRes.headers);
            backendRes.pipe(res);
          }
        );

        backendReq.on("error", (err) => {
          console.error("[Proxy] Backend error:", err);
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Bad Gateway - Backend error");
        });

        req.pipe(backendReq);
      } else {
        // Route everything else to frontend
        const frontendReq = http.request(
          {
            hostname: "localhost",
            port: frontendPort,
            path: req.url,
            method: req.method,
            headers: req.headers,
          },
          (frontendRes) => {
            res.writeHead(frontendRes.statusCode, frontendRes.headers);
            frontendRes.pipe(res);
          }
        );

        frontendReq.on("error", (err) => {
          console.error("[Proxy] Frontend error:", err);
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Bad Gateway - Frontend error");
        });

        req.pipe(frontendReq);
      }
    });

    server.listen(port, () => {
      console.log(`[Main] ✅ Server running on port ${port}`);
      console.log(`[Main] Backend: http://localhost:${backendPort}`);
      console.log(`[Main] Frontend: http://localhost:${frontendPort}`);
    });

    server.on("error", (err) => {
      console.error("[Proxy] Server error:", err);
      process.exit(1);
    });
  }, 2000);
}, 2000);

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("\n[Main] SIGTERM received, shutting down gracefully...");
  backend.kill("SIGTERM");
  setTimeout(() => process.exit(0), 10000);
});
