const express = require('express');
const router = express.Router();
const {
  raiseSOSAlert,
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert,
} = require('../controllers/sosController');

router.route('/')
  .post(raiseSOSAlert)
  .get(getActiveAlerts);

router.route('/:alertId/acknowledge')
  .put(acknowledgeAlert);

router.route('/:alertId/resolve')
  .put(resolveAlert);

module.exports = router;
