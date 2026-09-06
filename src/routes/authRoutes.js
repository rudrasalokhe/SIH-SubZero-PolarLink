const express = require('express');
const router = express.Router();
const { register, login, getMe, promoteUser } = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');
const requireRole = require('../middleware/requireRole');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.put('/promote/:personnelId', authenticate, requireRole(['hq_admin']), promoteUser);

module.exports = router;
