# Mikrotik Node.js ROS API

A Node.js API server for interacting with Mikrotik RouterOS devices using the RouterOS API.

## Project Structure

```
├── index.js                    # Main application entry point
├── package.json                # Project dependencies and scripts
├── ecosystem.config.js         # PM2 ecosystem configuration
├── .gitignore                  # Git ignore rules
├── logs/                       # Application logs directory
├── config/
│   └── config.js              # Application configuration
├── controllers/
│   ├── MikrotikController.js  # Mikrotik API controller class
│   └── WebsocketController.js # WebSocket connection controller class
├── routes/
│   ├── index.js               # Main routes index
│   └── mikrotik.js           # Mikrotik-specific routes
├── middleware/
│   └── errorHandler.js        # Error handling middleware
└── README.md                  # This file
```

## PM2 Deployment

This project is configured with **automatic CPU detection** that adapts to your server specifications:

- **1 CPU Core**: Uses 1 instance in fork mode (256MB memory limit)
- **Multiple CPU Cores**: Uses 2 instances in cluster mode (512MB memory limit per instance)

### Quick Start with PM2

1. **Check your system specifications:**
   ```bash
   npm run cpu-info
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application with auto-detection:**
   ```bash
   npm run pm2:start
   ```

4. **Check application status:**
   ```bash
   npm run pm2:status
   ```

### Automatic Configuration Features

✅ **Smart Instance Management**: 
- 1 core VPS → 1 instance (fork mode)
- Multi-core VPS → 2 instances max (cluster mode)

✅ **Memory Optimization**:
- 1 core → 256MB per instance
- Multi-core → 512MB per instance

✅ **Performance Tuning**:
- Automatically adjusts Node.js memory settings
- Optimized for both low-resource and high-performance servers

### PM2 Commands

- **Check CPU info:** `npm run cpu-info`
- **Start application:** `npm run pm2:start`
- **Stop application:** `npm run pm2:stop`
- **Restart application:** `npm run pm2:restart`
- **Reload application (zero-downtime):** `npm run pm2:reload`
- **Delete application from PM2:** `npm run pm2:delete`
- **View logs:** `npm run pm2:logs`
- **Monitor resources:** `npm run pm2:monit`
- **Start in production mode:** `npm run pm2:prod`

### PM2 Configuration

The application automatically configures itself based on CPU cores:

**Single Core VPS (1 CPU):**
- **Mode:** Fork (single process)
- **Instances:** 1
- **Memory limit:** 256MB
- **Best for:** Low-cost VPS, small applications

**Multi-Core VPS (2+ CPUs):**
- **Mode:** Cluster (load balanced)
- **Instances:** 2 (optimal performance)
- **Memory limit:** 512MB per instance
- **Best for:** Production servers, high-traffic applications

> 💡 **Note**: Even if your VPS has 16+ cores, the configuration uses maximum 2 instances for optimal performance and resource management.

### Environment Variables

Create a `.env` file in the root directory for environment-specific variables:

```env
NODE_ENV=production
PORT=3000
# Add your other environment variables here
```

## Architecture

The application follows the MVC (Model-View-Controller) pattern with WebSocket support:

- **Controllers**: Handle business logic and Mikrotik API interactions
  - `MikrotikController`: Manages RouterOS API operations and connections
  - `WebsocketController`: Handles real-time WebSocket connections and events
- **Routes**: Define API endpoints and route requests to controllers
- **Middleware**: Handle cross-cutting concerns like error handling and logging
- **Config**: Centralized configuration management

## API Endpoints

### Health Check
- **GET** `/health` - Check server status

### Mikrotik Commands
- **POST** `/api/cmd` - Execute command on Mikrotik device
- **GET** `/api/connections` - Get all active connections
- **DELETE** `/api/connections/:key` - Close specific connection
- **DELETE** `/api/connections` - Close all connections

## Usage

### Starting the Server
```bash
# Using npm
npm start

# Or directly with node
node index.js
```

The server will start on port 3666 by default and initialize both HTTP and WebSocket servers.

### Executing Commands

Send a POST request to `/api/cmd` with the following structure:

```json
{
  "cred": {
    "name": "Router Name",
    "ip": "192.168.1.1:8728",
    "username": "admin",
    "password": "password"
  },
  "cmd": "/ip/address/print",
  "data": [],
  "remove": false
}
```

### Response Format

All API responses follow this format:

```json
{
  "statusCode": 200,
  "message": "Success message",
  "data": {}
}
```

## Features

- **Connection Pooling**: Reuses existing connections for better performance
- **Error Handling**: Comprehensive error handling and logging
- **WebSocket Support**: Class-based WebSocket controller for real-time communication
- **CORS Enabled**: Cross-origin requests supported
- **Health Monitoring**: Health check endpoint for monitoring
- **Request Logging**: Automatic request logging with timestamps
- **Modular Architecture**: Clean separation of concerns with dedicated controller classes

## Recent Improvements

### WebSocket Controller Refactoring
The WebSocket functionality has been refactored from procedural code to a proper class-based structure:

- **Class-based Architecture**: WebSocket handling is now encapsulated in the `WebsocketController` class
- **Better Integration**: Clean integration with the main application through dependency injection
- **Improved Maintainability**: Organized code structure with clear separation of concerns
- **Extensible Design**: Easily extensible for future Mikrotik-specific WebSocket features
- **Error Handling**: Robust error handling and connection management

### Configuration

Configuration is managed in `config/config.js`:

- **Port**: Server port (default: 3666)
- **CORS**: Cross-origin resource sharing settings
- **Socket.IO**: WebSocket configuration

## WebSocket Support

The application includes real-time WebSocket communication for live monitoring and interaction with Mikrotik devices.

### WebSocket Controller Class

The `WebsocketController` class manages WebSocket connections and provides real-time communication capabilities:

#### Constructor
```javascript
new WebsocketController(server, io, app)
```

**Parameters:**
- `server` - HTTP server instance
- `io` - Socket.IO instance
- `app` - Express application instance

#### Key Features
- **Connection Management**: Automatically handles client connections and disconnections
- **Event Handling**: Initializes socket event listeners for real-time communication
- **Logging**: Provides connection status logging and client notifications
- **Extensible Architecture**: Designed for easy addition of Mikrotik-specific WebSocket events

#### Integration
The WebsocketController is automatically initialized in the main application:

```javascript
const WebsocketController = require("./controllers/WebsocketController");
const websocketController = new WebsocketController(server, io, app);
```

### WebSocket Events

Currently supported events:
- **connection** - Client connects to the server
- **disconnect** - Client disconnects from the server
- **log** - Server sends log messages to connected clients

### Future WebSocket Features
The architecture supports future implementation of:
- Real-time Mikrotik resource monitoring
- Live queue statistics
- Connection status updates
- Command execution feedback

## Class-Based Controllers

### MikrotikController

The `MikrotikController` class provides the following methods:

- `executeCommand(req, res)` - Execute RouterOS commands
- `getActiveConnections(req, res)` - List active connections
- `closeSpecificConnection(req, res)` - Close a specific connection
- `closeAllConnections(req, res)` - Close all connections
- `closeConnection(key)` - Internal method to close connections

### WebsocketController

The `WebsocketController` class provides real-time WebSocket functionality:

- `constructor(server, io, app)` - Initialize WebSocket controller with server instances
- `initializeSocketEvents()` - Set up Socket.IO event handlers for client connections

## Dependencies

- `express` - Web framework
- `socket.io` - WebSocket library
- `node-routeros` - RouterOS API client
- `cors` - Cross-origin resource sharing
- `body-parser` - Request body parsing

## Environment Variables

- `PORT` - Server port (optional, defaults to 3666)
- `NODE_ENV` - Environment mode (development/production)
