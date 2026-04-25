const router = require('express').Router();
const Sale   = require('../models/Sale');
const auth   = require('../middleware/auth');

// GET /api/billing
// Last 20 transactions — for the billing page sidebar
router.get('/', auth, async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 }).limit(20);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/billing/history
// Full paginated transaction history with search + date filter
// Query params: page, limit, search, startDate, endDate, cashier
router.get('/history', auth, async (req, res) => {
  try {
    const page      = parseInt(req.query.page)      || 1;
    const limit     = parseInt(req.query.limit)     || 20;
    const search    = req.query.search    || '';
    const startDate = req.query.startDate || '';
    const endDate   = req.query.endDate   || '';
    const cashier   = req.query.cashier   || '';

    let query = {};

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      if (endDate)   query.createdAt.$lte = new Date(endDate   + 'T23:59:59.999Z');
    }

    // Search by receipt number
    if (search) {
      query.receiptNumber = { $regex: search, $options: 'i' };
    }

    // Filter by cashier name
    if (cashier) {
      query.cashierName = { $regex: cashier, $options: 'i' };
    }

    const total = await Sale.countDocuments(query);
    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Summary stats for filtered results
    const allFiltered = await Sale.find(query);
    const totalRevenue   = allFiltered.reduce((s, sale) => s + sale.total, 0);
    const totalItems     = allFiltered.reduce((s, sale) => s + (sale.items?.length || 0), 0);
    const avgOrderValue  = total > 0 ? totalRevenue / total : 0;

    res.json({
      sales,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      summary: {
        totalRevenue:  parseFloat(totalRevenue.toFixed(2)),
        totalItems,
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        totalOrders:   total,
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/billing/:id — single receipt
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
