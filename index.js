const express = require("express");
const cors = require("cors");
const http = require("http");
const bodyParser = require("body-parser");
const socketIO = require("socket.io");

// Import configuration and routes
const config = require("./config/config");
const routes = require("./routes");
const { errorHandler, notFound, requestLogger } = require("./middleware/errorHandler");

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
  
  // Add any socket event handlers here if needed
});

// Start server
server.listen(config.port, () => {
  console.log(`Server is running on localhost:${config.port}`);
});
