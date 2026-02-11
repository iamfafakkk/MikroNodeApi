const express = require("express");
const cors = require("cors");
const http = require("http");
const bodyParser = require("body-parser");
const socketIO = require("socket.io");

// Global process-level safety nets to avoid crashing on exceptions
process.on("uncaughtException", (err) => {
  try {
    console.error("[uncaughtException]", err && err.stack ? err.stack : err);
  } catch (_) {}
  // Do not exit; keep process alive under PM2
});

process.on("unhandledRejection", (reason, promise) => {
  try {
    console.error("[unhandledRejection]", reason);
  } catch (_) {}
  // Do not exit; keep process alive under PM2
});

// Import configuration and routes
const config = require("./config/config");
const routes = require("./routes");
const { errorHandler, notFound, requestLogger } = require("./middleware/errorHandler");
const WebsocketController = require("./controllers/WebsocketController");

const app = express();

// Middleware
app.use(cors(config.cors));
app.use(bodyParser.json());
app.use(requestLogger);

// Routes
app.use("/api", routes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    statusCode: 200,
    message: "Server is running successfully",
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, config.socket);

// Initialize WebSocket Controller
const websocketController = new WebsocketController(server, io, app);

// Make websocketController available to routes through app locals
app.set('websocketController', websocketController);

// Graceful shutdown handlers (PM2 + signals)
const gracefulShutdown = (label) => {
  console.log(`[shutdown] received: ${label}`);
  try {
    server.close(() => {
      console.log("HTTP server closed gracefully");
      process.exit(0);
    });
    // Failsafe: force exit after timeout
    setTimeout(() => process.exit(0), 3000).unref();
  } catch (e) {
    console.error("Error during graceful shutdown:", e);
    process.exit(0);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// PM2 shutdown message support (when shutdown_with_message: true)
process.on("message", (msg) => {
  if (msg === "shutdown") {
    gracefulShutdown("pm2:shutdown");
  }
});

// Start server
server.listen(config.port, () => {
  console.log(`Server is running on localhost:${config.port}`);
  if (typeof process.send === "function") {
    // Inform PM2 that the app is ready when wait_ready is enabled
    process.send("ready");
  }
});
