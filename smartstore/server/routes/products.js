const router = require('express').Router();
const Product = require('../models/Product');
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');

// Helper: compute correct status from stock values (never trust stored status)
function computeStatus(stock, minStock) {
  if (stock === 0) return 'Out of Stock';
  if (stock <= minStock) return 'Low';
  return 'In Stock';
}

// GET all products
router.get('/', auth, async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = {};
    if (category && category !== 'All') query.category = category;
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { category: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    let products = await Product.find(query).sort({ createdAt: -1 });

    // Always recompute status live so stale DB values never show
    products = products.map(p => {
      const computed = computeStatus(p.stock, p.minStock);
      p.status = computed;
      return p;
    });

    // Apply status filter after recompute
    if (status && status !== 'All') {
      products = products.filter(p => p.status === status);
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single product — does NOT increment views
// View tracking only happens on /products/:id/detail
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    // Recompute status live before returning
    if (product.stock === 0) product.status = 'Out of Stock';
    else if (product.stock <= product.minStock) product.status = 'Low';
    else product.status = 'In Stock';
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create product
router.post('/', auth, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update product — use findById + save() so pre('save') middleware fires
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    Object.assign(product, req.body);
    await product.save(); // triggers pre('save') → status auto-recalculates

    // If stock is now healthy, auto-resolve existing Low Stock alerts
    if (product.status === 'In Stock') {
      await Alert.updateMany(
        { product: product._id, type: 'Low Stock', status: 'PENDING' },
        { status: 'RESOLVED' }
      );
    }

    // If stock is low/out, create alert only if none pending
    if (product.status === 'Low' || product.status === 'Out of Stock') {
      const existingAlert = await Alert.findOne({ product: product._id, type: 'Low Stock', status: 'PENDING' });
      if (!existingAlert) {
        const alert = await Alert.create({
          type: 'Low Stock', product: product._id, productName: product.name,
          message: `${product.name} is low on stock. Current: ${product.stock}`,
          metadata: { currentStock: product.stock, minStock: product.minStock }
        });
        req.io?.emit('new_alert', alert);
      }
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE product
router.delete('/:id', auth, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// GET /api/products/:id/detail
// Full product detail: product info + sales history + stats
// Increments totalViews on each call
router.get('/:id/detail', auth, async (req, res) => {
  try {
    const Sale = require('../models/Sale');
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Increment view count
    product.totalViews += 1;
    await product.save();

    // Sales history for this product (last 30 days, day by day)
    const salesHistory = [];
    for (let i = 29; i >= 0; i--) {
      const date  = new Date();
      date.setDate(date.getDate() - i);
      const start = new Date(new Date(date).setHours(0,0,0,0));
      const end   = new Date(new Date(date).setHours(23,59,59,999));
      const sales = await Sale.find({ createdAt: { $gte: start, $lte: end } });
      const dayQty = sales.reduce((sum, s) => {
        const item = s.items.find(it => it.product?.toString() === product._id.toString());
        return sum + (item ? item.qty : 0);
      }, 0);
      const dayRev = sales.reduce((sum, s) => {
        const item = s.items.find(it => it.product?.toString() === product._id.toString());
        return sum + (item ? item.total : 0);
      }, 0);
      salesHistory.push({
        date:    start.toLocaleDateString('en-US', { month:'short', day:'numeric' }),
        qty:     dayQty,
        revenue: parseFloat(dayRev.toFixed(2)),
      });
    }

    // All-time stats
    const allSales = await Sale.find();
    let totalUnitsSold = 0, totalRevenue = 0, totalTransactions = 0;
    allSales.forEach(sale => {
      const item = sale.items.find(it => it.product?.toString() === product._id.toString());
      if (item) {
        totalUnitsSold  += item.qty;
        totalRevenue    += item.total;
        totalTransactions += 1;
      }
    });

    const profitPerUnit = product.price - (product.costPrice || 0);
    const totalProfit   = parseFloat((profitPerUnit * totalUnitsSold).toFixed(2));
    const marginPct     = product.price > 0 ? Math.round((profitPerUnit / product.price) * 100) : 0;

    res.json({
      product: {
        ...product.toObject(),
        status: product.stock === 0 ? 'Out of Stock' : product.stock <= product.minStock ? 'Low' : 'In Stock',
      },
      stats: {
        totalUnitsSold,
        totalRevenue:     parseFloat(totalRevenue.toFixed(2)),
        totalTransactions,
        totalProfit,
        marginPct,
        profitPerUnit:    parseFloat(profitPerUnit.toFixed(2)),
      },
      salesHistory,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET categories
router.get('/meta/categories', auth, async (req, res) => {
  try {
    const categories = await Product.distinct('category');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
