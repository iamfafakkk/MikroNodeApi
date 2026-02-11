class EventController {
  /**
   * Trigger WebSocket event to all connected clients
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async triggerEvent(req, res) {
    try {
      // Get domain from query parameter or request body
      const domain = req.query.domain || req.body?.domain;
      
      // Validate domain parameter
      if (!domain || typeof domain !== 'string' || domain.trim() === '') {
        return res.status(400).json({
          statusCode: 400,
          message: "Domain parameter is required and must be a non-empty string"
        });
      }

      const trimmedDomain = domain.trim();
      const eventName = `/trigger/event/${trimmedDomain}`;
      const eventData = { domain: trimmedDomain };
      
      console.log(`Triggering WebSocket event: ${eventName} with data:`, eventData);
      
      // Access the WebSocket instance from app locals
      const websocketController = req.app.get('websocketController');
      if (!websocketController || !websocketController.io) {
        return res.status(500).json({
          statusCode: 500,
          message: "WebSocket controller not properly initialized"
        });
      }
      
      // Broadcast event to all connected clients
      websocketController.io.emit(eventName, eventData);
      
      res.status(200).json({
        statusCode: 200,
        message: `Event triggered successfully: ${eventName}`,
        event: eventName,
        data: eventData
      });
      
    } catch (err) {
      console.error("Error triggering event:", err?.message || err);
      res.status(500).json({
        statusCode: 500,
        message: err.message || "An error occurred while triggering the event"
      });
    }
  }
}

module.exports = EventController;