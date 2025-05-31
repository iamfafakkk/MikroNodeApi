const express = require('express');
const MikrotikController = require('../controllers/MikrotikController');

const router = express.Router();
const mikrotikController = new MikrotikController();

// Execute command on Mikrotik device
router.post('/cmd', (req, res) => {
  mikrotikController.executeCommand(req, res);
});

// Get all active connections
router.get('/connections', (req, res) => {
  mikrotikController.getActiveConnections(req, res);
});

// Close specific connection
router.delete('/connections/:key', (req, res) => {
  mikrotikController.closeSpecificConnection(req, res);
});

// Close all connections
router.delete('/connections', (req, res) => {
  mikrotikController.closeAllConnections(req, res);
});

module.exports = router;
