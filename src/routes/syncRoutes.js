const express = require('express');
const router = express.Router();
const {
  getPendingSync,
  acknowledgeSync,
} = require('../controllers/syncController');

router.route('/pending')
  .get(getPendingSync);

router.route('/ack')
  .post(acknowledgeSync);

module.exports = router;
