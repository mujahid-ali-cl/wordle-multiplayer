import dotenv from "dotenv";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import http from "http";
import https from "https";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint for self-pinging
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Self-pinging mechanism to keep the app alive
function startSelfPing() {
  // Configuration - can be overridden with environment variables
  const pingInterval = parseInt(process.env.PING_INTERVAL || '600000'); // 10 minutes default
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 80}`;
  const enableSelfPing = process.env.ENABLE_SELF_PING !== 'false'; // enabled by default
  
  if (!enableSelfPing) {
    log('Self-ping mechanism disabled by ENABLE_SELF_PING=false');
    return;
  }
  
  const pingSelf = () => {
    const url = new URL(`${baseUrl}/health`);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Wordle-Multiplayer-Self-Ping/1.0'
      }
    }, (res) => {
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
        log(`Self-ping successful: ${res.statusCode}`);
      } else {
        log(`Self-ping failed: ${res.statusCode}`);
      }
    });
    
    req.on('error', (error) => {
      log(`Self-ping error: ${error.message}`);
    });
    
    req.on('timeout', () => {
      log('Self-ping timeout');
      req.destroy();
    });
    
    req.end();
  };

  // Start the interval
  const intervalId = setInterval(pingSelf, pingInterval);
  
  // Also ping immediately on startup
  const initialPingId = setTimeout(pingSelf, 5000); // Wait 5 seconds after startup
  
  log(`Self-ping mechanism started - will ping every ${pingInterval / 1000 / 60} minutes`);
  
  // Cleanup function (useful for graceful shutdown)
  return () => {
    clearInterval(intervalId);
    clearTimeout(initialPingId);
    log('Self-ping mechanism stopped');
  };
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = process.env.PORT || 80;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start self-pinging after server is ready
    startSelfPing();
  });
})();
