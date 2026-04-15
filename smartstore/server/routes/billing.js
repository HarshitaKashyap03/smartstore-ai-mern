const router = require('express').Router();
const Sale = require('../models/Sale');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 }).limit(20);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Receipt not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
