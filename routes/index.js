const express = require('express');
const mikrotikRoutes = require('./mikrotik');

const router = express.Router();

// Mount mikrotik routes directly under /api (for backward compatibility)
router.use('/', mikrotikRoutes);

// You can add more route modules here
// router.use('/users', userRoutes);
// router.use('/auth', authRoutes);

module.exports = router;
