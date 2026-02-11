const express = require('express');
const mikrotikRoutes = require('./mikrotik');
const eventRoutes = require('./events');

const router = express.Router();

// Mount mikrotik routes directly under /api (for backward compatibility)
router.use('/', mikrotikRoutes);

// Mount event routes under /api/events
router.use('/events', eventRoutes);

// You can add more route modules here
// router.use('/users', userRoutes);
// router.use('/auth', authRoutes);

module.exports = router;
