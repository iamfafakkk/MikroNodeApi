const express = require('express');
const EventController = require('../controllers/EventController');

const router = express.Router();
const eventController = new EventController();

// Trigger WebSocket event
router.get('/trigger/event', (req, res) => {
  eventController.triggerEvent(req, res);
});

module.exports = router;