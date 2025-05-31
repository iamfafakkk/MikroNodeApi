const { RouterOSAPI } = require("node-routeros");

class MikrotikController {
  constructor() {
    this.credMap = new Map();
    this.connMap = new Map();
  }

  /**
   * Close connection and clean up maps
   * @param {string} key - Connection key
   */
  async closeConnection(key) {
    if (this.connMap.has(key)) {
      try {
        await this.connMap.get(key).close();
      } catch (err) {
        console.error("Error closing connection:", err);
      }
      this.connMap.delete(key);
      this.credMap.delete(key);
    }
  }

  /**
   * Execute command on Mikrotik device
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async executeCommand(req, res) {
    const ipPort = req.body.cred.ip.split(":");
    const remove = req.body.remove || false;
    const key = `${ipPort[0]}:${ipPort[1]}:${req.body.cred.username}`;
    
    console.log("\n\n");
    
    try {
      // Check if connection already exists
      if (this.credMap.has(key)) {
        console.log("Using existing connection for", req.body.cred.name);
        const conn = this.connMap.get(key);
        await conn.connect();
        const data = await conn.write(req.body.cmd, req.body.data);

        if (remove) {
          console.log("Removing command");
          await conn.write(req.body.cmd.replace(/\/print$/, "/remove"), [
            "=.id=" + data[0][".id"],
          ]);
        }

        return res.status(200).json({
          statusCode: 200,
          message: "Successfully executed command",
          data,
        });
      }

      // Close previous connection if exists
      await this.closeConnection(key);

      console.log("Creating new connection for", req.body.cred);

      // Create new connection
      const conn = new RouterOSAPI({
        host: ipPort[0],
        port: parseInt(ipPort[1], 10),
        user: req.body.cred.username,
        password: req.body.cred.password,
        keepalive: true,
      });

      // Set up event handlers
      conn.on("error", async (err) => {
        console.error("Connection error:", err?.message || err);
        await this.closeConnection(key);
      });

      conn.on("close", () => {
        console.log("Connection closed for", req.body.cred.name);
        this.closeConnection(key);
      });

      // Connect and store connection
      await conn.connect();
      this.credMap.set(key, req.body.cred);
      this.connMap.set(key, conn);

      console.log("Connected to Mikrotik:", req.body.cred.name);
      
      // Execute command
      const data = await conn.write(req.body.cmd, req.body.data);

      if (remove) {
        console.log("Removing command");
        await conn.write(req.body.cmd.replace(/\/print$/, "/remove"), [
          "=.id=" + data[0][".id"],
        ]);
      }

      res.status(200).json({
        statusCode: 200,
        message: "Successfully executed command",
        data,
      });

    } catch (err) {
      console.error(err?.message || err);
      await this.closeConnection(key);
      res.status(400).json({
        statusCode: 400,
        message: err.message || "An error occurred",
      });
    }
  }

  /**
   * Get all active connections
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getActiveConnections(req, res) {
    try {
      const connections = Array.from(this.credMap.entries()).map(([key, cred]) => ({
        key,
        name: cred.name,
        ip: cred.ip,
        username: cred.username
      }));

      res.status(200).json({
        statusCode: 200,
        message: "Active connections retrieved successfully",
        data: connections
      });
    } catch (err) {
      console.error(err?.message || err);
      res.status(400).json({
        statusCode: 400,
        message: err.message || "An error occurred",
      });
    }
  }

  /**
   * Close specific connection
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async closeSpecificConnection(req, res) {
    try {
      const { key } = req.params;
      await this.closeConnection(key);

      res.status(200).json({
        statusCode: 200,
        message: "Connection closed successfully"
      });
    } catch (err) {
      console.error(err?.message || err);
      res.status(400).json({
        statusCode: 400,
        message: err.message || "An error occurred",
      });
    }
  }

  /**
   * Close all connections
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async closeAllConnections(req, res) {
    try {
      const keys = Array.from(this.connMap.keys());
      for (const key of keys) {
        await this.closeConnection(key);
      }

      res.status(200).json({
        statusCode: 200,
        message: "All connections closed successfully"
      });
    } catch (err) {
      console.error(err?.message || err);
      res.status(400).json({
        statusCode: 400,
        message: err.message || "An error occurred",
      });
    }
  }
}

module.exports = MikrotikController;
