const express = require('express');
const router = express.Router();
const {
  createPersonnel,
  getAllPersonnel,
  getAvailableMedics,
  getPersonnelById,
  updatePersonnel,
} = require('../controllers/personnelController');

router.route('/')
  .post(createPersonnel)
  .get(getAllPersonnel);

// Specific routes before parameterized :personnelId
router.route('/available-medics')
  .get(getAvailableMedics);

router.route('/:personnelId')
  .get(getPersonnelById)
  .put(updatePersonnel);

module.exports = router;
