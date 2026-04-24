const router = require('express').Router();
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const auth = require('../middleware/auth');

// Moving average — returns predicted units for next 30 days
function movingAvgPrediction(dailySales) {
  const nonZero = dailySales.filter(v => v > 0);
  if (nonZero.length === 0) return 0;
  const avg = nonZero.reduce((s, v) => s + v, 0) / nonZero.length;
  return Math.round(avg * 30);
}

// Stock coverage — how many days current stock will last
// Returns null if no sales data (can't predict)
function calcCoverageDays(currentStock, predicted30Days) {
  if (predicted30Days === 0) return null; // no sales history
  const dailyDemand = predicted30Days / 30;
  return Math.round(currentStock / dailyDemand);
}

// GET /api/predict — demand predictions with coverage & last sold
router.get('/', auth, async (req, res) => {
  try {
    const products = await Product.find();
    const sales    = await Sale.find().sort({ createdAt: 1 });

    const predictions = await Promise.all(products.map(async (product) => {
      // Build daily sales array (last 30 days)
      const productSales = [];
      for (let i = 29; i >= 0; i--) {
        const date  = new Date();
        date.setDate(date.getDate() - i);
        const start = new Date(new Date(date).setHours(0,0,0,0));
        const end   = new Date(new Date(date).setHours(23,59,59,999));
        const daySales = sales
          .filter(s => new Date(s.createdAt) >= start && new Date(s.createdAt) <= end)
          .reduce((sum, s) => {
            const item = s.items.find(i => i.product?.toString() === product._id.toString());
            return sum + (item ? item.qty : 0);
          }, 0);
        productSales.push(daySales);
      }

      const hasSalesData    = productSales.some(v => v > 0);
      const predicted30Days = hasSalesData ? movingAvgPrediction(productSales) : 0;
      const coverageDays    = calcCoverageDays(product.stock, predicted30Days);
      const restockQty      = predicted30Days > 0
        ? Math.max(0, predicted30Days - product.stock + 10)
        : 0;

      // Last sold: from product.lastSoldAt or scan sales
      let lastSoldAt = product.lastSoldAt || null;
      if (!lastSoldAt) {
        const lastSale = [...sales]
          .reverse()
          .find(s => s.items.some(i => i.product?.toString() === product._id.toString()));
        if (lastSale) lastSoldAt = lastSale.createdAt;
      }

      return {
        _id:            product._id,
        name:           product.name,
        category:       product.category,
        currentStock:   product.stock,
        minStock:       product.minStock,
        predicted30Days,
        coverageDays,       // null = no sales history
        hasSalesData,
        restockQty,
        lastSoldAt,         // null = never sold
      };
    }));

    // Sort: products with sales data first, then by predicted demand desc
    predictions.sort((a, b) => {
      if (a.hasSalesData !== b.hasSalesData) return b.hasSalesData - a.hasSalesData;
      return b.predicted30Days - a.predicted30Days;
    });

    res.json(predictions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/predict/recommend — association rules (bought together)
router.get('/recommend', auth, async (req, res) => {
  try {
    const sales = await Sale.find();
    const cooccurrence = {};
    sales.forEach(sale => {
      const names = sale.items.map(i => i.name);
      for (let i = 0; i < names.length; i++) {
        for (let j = 0; j < names.length; j++) {
          if (i !== j) {
            const key = `${names[i]}|||${names[j]}`;
            cooccurrence[key] = (cooccurrence[key] || 0) + 1;
          }
        }
      }
    });
    const pairs = Object.entries(cooccurrence)
      .map(([key, count]) => {
        const [from, to] = key.split('|||');
        return { from, to, count, confidence: Math.min(99, 60 + count * 5) };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    res.json(pairs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
