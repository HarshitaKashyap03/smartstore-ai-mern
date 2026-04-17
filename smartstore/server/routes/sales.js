const router = require('express').Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');

// GET all sales
router.get('/', auth, async (req, res) => {
  try {
    const sales = await Sale.find().sort({ createdAt: -1 }).limit(50);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET daily sales totals for chart (last 7 days)
router.get('/daily', auth, async (req, res) => {
  try {
    const days = 7;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(date.setHours(0,0,0,0));
      const end = new Date(date.setHours(23,59,59,999));
      const sales = await Sale.find({ createdAt: { $gte: start, $lte: end } });
      const total = sales.reduce((s, sale) => s + sale.total, 0);
      result.push({
        day: start.toLocaleDateString('en-US', { weekday: 'short' }),
        total: parseFloat(total.toFixed(2)),
        orders: sales.length
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET top selling products
router.get('/top-products', auth, async (req, res) => {
  try {
    const sales = await Sale.find();
    const counts = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + item.qty;
      });
    });
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create sale — with stock validation BEFORE creating the sale
router.post('/', auth, async (req, res) => {
  try {
    const { items, subtotal, tax, discount, total } = req.body;

    // ── STOCK VALIDATION ──────────────────────────────────────────────
    // Check every item before touching the database
    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(400).json({
          message: `Product not found: ${item.name}`
        });
      }

      if (product.stock === 0) {
        return res.status(400).json({
          message: `"${product.name}" is out of stock (0 units available)`
        });
      }

      if (product.stock < item.qty) {
        return res.status(400).json({
          message: `"${product.name}" only has ${product.stock} unit(s) in stock, but you requested ${item.qty}`
        });
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // All items passed validation — create the sale
    const sale = await Sale.create({
      items, subtotal, tax, discount, total,
      cashier: req.user.id,
      cashierName: req.user.name
    });

    // Deduct stock for each item
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock = product.stock - item.qty; // safe — already validated above
        product.lastSoldAt = new Date();
        await product.save(); // pre('save') recalculates status automatically

        // Fire low stock alert if needed
        if (product.stock <= product.minStock) {
          const exists = await Alert.findOne({ product: product._id, type: 'Low Stock', status: 'PENDING' });
          if (!exists) {
            const alert = await Alert.create({
              type: 'Low Stock', product: product._id, productName: product.name,
              message: `Low stock: ${product.name} (${product.stock} left)`,
              metadata: { currentStock: product.stock, minStock: product.minStock }
            });
            req.io?.emit('new_alert', alert);
          }
        }
      }
    }

    req.io?.emit('new_sale', sale);
    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;