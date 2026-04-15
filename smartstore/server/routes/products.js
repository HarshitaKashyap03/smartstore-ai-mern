const router = require('express').Router();
const Product = require('../models/Product');
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');

// GET all products
router.get('/', auth, async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = {};
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;
    if (search) query.name = { $regex: search, $options: 'i' };
    const products = await Product.find(query).sort({ createdAt: -1 });
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
    await product.save();
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

// PUT update product
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    // Check for low stock alert
    if (product.stock <= product.minStock && product.stock > 0) {
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
