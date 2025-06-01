# Mikrotik Node.js ROS API

A Node.js API server for interacting with Mikrotik RouterOS devices using the RouterOS API.

## Project Structure

```
├── index.js                    # Main application entry point
├── package.json                # Project dependencies and scripts
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
