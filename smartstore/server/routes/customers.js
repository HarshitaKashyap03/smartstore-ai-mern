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

// GET /api/customers/velocity
// Sales velocity: last 7 days vs previous 7 days per product
router.get('/velocity', auth, async (req, res) => {
  try {
    const now = new Date();

    const last7Start = new Date(now); last7Start.setDate(last7Start.getDate() - 7); last7Start.setHours(0,0,0,0);
    const prev7Start = new Date(now); prev7Start.setDate(prev7Start.getDate() - 14); prev7Start.setHours(0,0,0,0);
    const prev7End   = new Date(last7Start); prev7End.setMilliseconds(-1);

    const last7Sales = await Sale.find({ createdAt: { $gte: last7Start } });
    const prev7Sales = await Sale.find({ createdAt: { $gte: prev7Start, $lte: prev7End } });

    // Count units sold per product in each period
    const countUnits = (sales) => {
      const map = {};
      sales.forEach(sale => {
        sale.items.forEach(item => {
          map[item.name] = (map[item.name] || 0) + item.qty;
        });
      });
      return map;
    };

    const last7Map = countUnits(last7Sales);
    const prev7Map = countUnits(prev7Sales);

    const products = await Product.find({}, 'name category');
    const result = products.map(p => {
      const last7 = last7Map[p.name] || 0;
      const prev7 = prev7Map[p.name] || 0;
      let trend, changePct;

      if (prev7 === 0 && last7 === 0) {
        trend = 'no-sales'; changePct = 0;
      } else if (prev7 === 0 && last7 > 0) {
        trend = 'up'; changePct = 100;
      } else {
        changePct = parseFloat((((last7 - prev7) / prev7) * 100).toFixed(1));
        if (changePct > 10)       trend = 'up';
        else if (changePct < -10) trend = 'down';
        else                      trend = 'stable';
      }

      return { name: p.name, category: p.category, last7, prev7, trend, changePct };
    });

    // Sort: up first, then stable, then down, then no-sales
    const order = { up: 0, stable: 1, down: 2, 'no-sales': 3 };
    result.sort((a, b) => order[a.trend] - order[b.trend]);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/customers/revenue-contribution
// What % of total revenue each product contributes
router.get('/revenue-contribution', auth, async (req, res) => {
  try {
    const sales = await Sale.find();
    const revenueMap = {};
    let totalRevenue = 0;

    sales.forEach(sale => {
      sale.items.forEach(item => {
        revenueMap[item.name] = (revenueMap[item.name] || 0) + item.total;
        totalRevenue += item.total;
      });
    });

    const result = Object.entries(revenueMap)
      .map(([name, revenue]) => ({
        name,
        revenue: parseFloat(revenue.toFixed(2)),
        pct: totalRevenue > 0 ? parseFloat(((revenue / totalRevenue) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({ products: result, totalRevenue: parseFloat(totalRevenue.toFixed(2)) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
