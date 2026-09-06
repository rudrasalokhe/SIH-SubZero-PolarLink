const express = require('express');
const router = express.Router();
const { getDashboardStats, getHQOverview } = require('../controllers/dashboardController');
const requireRole = require('../middleware/requireRole');

router.get('/stats', getDashboardStats);
router.get('/hq-overview', requireRole(['hq_admin']), getHQOverview);

module.exports = router;
