const express = require('express');
const router = express.Router();
const {
  createCargo,
  getAllCargo,
  getLowStockCargo,
  getCargoById,
  updateCargo,
  deleteCargo,
} = require('../controllers/cargoController');

router.route('/')
  .post(createCargo)
  .get(getAllCargo);

// Specific routes before parameterized :itemId
router.route('/low-stock')
  .get(getLowStockCargo);

router.route('/:itemId')
  .get(getCargoById)
  .put(updateCargo)
  .delete(deleteCargo);

module.exports = router;
