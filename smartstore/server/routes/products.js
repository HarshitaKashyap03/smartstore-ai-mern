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
    if (search) query.name = { $regex: search, $options: 'i' };

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

// GET single product
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.totalViews += 1;
    await product.save(); // pre('save') will also recompute status
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