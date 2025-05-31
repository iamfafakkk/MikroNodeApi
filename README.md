# Mikrotik Node.js ROS API

A Node.js API server for interacting with Mikrotik RouterOS devices using the RouterOS API.

## Project Structure

```
├── index.js                    # Main application entry point
├── package.json                # Project dependencies and scripts
├── config/
│   └── config.js              # Application configuration
├── controllers/
│   └── MikrotikController.js  # Mikrotik API controller class
├── routes/
│   ├── index.js               # Main routes index
│   └── mikrotik.js           # Mikrotik-specific routes
├── middleware/
│   └── errorHandler.js        # Error handling middleware
└── README.md                  # This file
```

## Architecture

The application follows the MVC (Model-View-Controller) pattern:

- **Controllers**: Handle business logic and Mikrotik API interactions
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
node index.js
```

The server will start on port 3666 by default.

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
- **Socket.IO Support**: WebSocket support for real-time communication
- **CORS Enabled**: Cross-origin requests supported
- **Health Monitoring**: Health check endpoint for monitoring
- **Request Logging**: Automatic request logging with timestamps

## Configuration

Configuration is managed in `config/config.js`:

- **Port**: Server port (default: 3666)
- **CORS**: Cross-origin resource sharing settings
- **Socket.IO**: WebSocket configuration

## Class-Based Controller

The `MikrotikController` class provides the following methods:

- `executeCommand(req, res)` - Execute RouterOS commands
- `getActiveConnections(req, res)` - List active connections
- `closeSpecificConnection(req, res)` - Close a specific connection
- `closeAllConnections(req, res)` - Close all connections
- `closeConnection(key)` - Internal method to close connections

## Dependencies

- `express` - Web framework
- `socket.io` - WebSocket library
- `node-routeros` - RouterOS API client
- `cors` - Cross-origin resource sharing
- `body-parser` - Request body parsing

## Environment Variables

- `PORT` - Server port (optional, defaults to 3666)
- `NODE_ENV` - Environment mode (development/production)
