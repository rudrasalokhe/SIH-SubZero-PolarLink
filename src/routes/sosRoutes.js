const express = require('express');
const router = express.Router();
const {
  raiseSOSAlert,
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
} = require('../controllers/sosController');
const requireRole = require('../middleware/requireRole');

router.route('/')
  .post(raiseSOSAlert)
  .get(getActiveAlerts);

router.route('/:alertId/acknowledge')
  .put(requireRole(['medic', 'commander']), acknowledgeAlert);

router.route('/:alertId/resolve')
  .put(requireRole(['medic', 'commander']), resolveAlert);

module.exports = router;
