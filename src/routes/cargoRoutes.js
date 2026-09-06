const express = require('express');
const router = express.Router();
const {
  createCargo,
  getAllCargo,
  getLowStockCargo,
  getCargoById,
  updateCargo,
  deleteCargo,
  confirmCargo,
} = require('../controllers/cargoController');
const requireRole = require('../middleware/requireRole');

router.route('/')
  .post(createCargo)
  .get(getAllCargo);

// Specific routes before parameterized :itemId
router.route('/low-stock')
  .get(getLowStockCargo);

router.put('/:itemId/confirm', requireRole(['commander', 'logistics']), confirmCargo);

router.route('/:itemId')
  .get(getCargoById)
  .put(updateCargo)
  .delete(deleteCargo);

module.exports = router;
