const router = require('express').Router();
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const auth = require('../middleware/auth');

// GET frequently bought together heatmap
router.get('/heatmap', auth, async (req, res) => {
  try {
    const sales = await Sale.find();
    const products = await Product.find({}, 'name').limit(7);
    const names = products.map(p => p.name);

    const matrix = {};
    names.forEach(a => {
      matrix[a] = {};
      names.forEach(b => { matrix[a][b] = 0; });
    });

    sales.forEach(sale => {
      const itemNames = sale.items.map(i => i.name).filter(n => names.includes(n));
      for (let i = 0; i < itemNames.length; i++) {
        for (let j = 0; j < itemNames.length; j++) {
          if (i !== j && matrix[itemNames[i]] && matrix[itemNames[i]][itemNames[j]] !== undefined) {
            matrix[itemNames[i]][itemNames[j]] += 1;
          }
        }
      }
    });

    // Normalize to percentage
    const normalized = {};
    names.forEach(a => {
      normalized[a] = {};
      const maxVal = Math.max(...names.map(b => matrix[a][b]), 1);
      names.forEach(b => {
        normalized[a][b] = a === b ? 0 : Math.round((matrix[a][b] / maxVal) * 100);
      });
    });

    res.json({ products: names, matrix: normalized });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET top viewed products
router.get('/top-viewed', auth, async (req, res) => {
  try {
    const products = await Product.find().sort({ totalViews: -1 }).limit(5);
    res.json(products.map(p => ({ name: p.name, views: p.totalViews })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET purchase patterns
router.get('/patterns', auth, async (req, res) => {
  try {
    const sales = await Sale.find();
    const cooccurrence = {};
    sales.forEach(sale => {
      const names = sale.items.map(i => i.name);
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const key = [names[i], names[j]].sort().join(' + ');
          cooccurrence[key] = (cooccurrence[key] || 0) + 1;
        }
      }
    });
    const patterns = Object.entries(cooccurrence)
      .map(([pair, count]) => ({ pair, count, pct: Math.min(99, 50 + count * 8) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    res.json(patterns);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
