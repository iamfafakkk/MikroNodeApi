const express = require("express");
const cors = require("cors");
const http = require("http");
const bodyParser = require("body-parser");
const socketIO = require("socket.io");

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

// Start server
server.listen(config.port, () => {
  console.log(`Server is running on localhost:${config.port}`);
});
