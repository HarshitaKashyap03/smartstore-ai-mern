const router = require('express').Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

// GET dashboard KPIs
router.get('/kpi', auth, async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0,0,0,0));
    const endOfDay = new Date(today.setHours(23,59,59,999));

    const todaySales = await Sale.find({ createdAt: { $gte: startOfDay, $lte: endOfDay } });
    const totalRevenue = todaySales.reduce((s, sale) => s + sale.total, 0);
    const totalOrders = todaySales.length;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStart = new Date(yesterday.setHours(0,0,0,0));
    const yEnd = new Date(yesterday.setHours(23,59,59,999));
    const yestSales = await Sale.find({ createdAt: { $gte: yStart, $lte: yEnd } });
    const yestRevenue = yestSales.reduce((s, sale) => s + sale.total, 0);
    const yestOrders = yestSales.length;

    const lowStockCount = await Product.countDocuments({ status: 'Low' });
    const topProduct = await getTopProduct();

    const revenueChange = yestRevenue > 0 ? (((totalRevenue - yestRevenue) / yestRevenue) * 100).toFixed(1) : 0;
    const ordersChange = yestOrders > 0 ? (((totalOrders - yestOrders) / yestOrders) * 100).toFixed(1) : 0;

    res.json({ totalRevenue: totalRevenue.toFixed(2), totalOrders, lowStockCount, topProduct, revenueChange, ordersChange });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getTopProduct() {
  const sales = await Sale.find();
  const counts = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      counts[item.name] = (counts[item.name] || 0) + item.qty;
    });
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? { name: sorted[0][0], qty: sorted[0][1] } : null;
}

// GET revenue by category
router.get('/category', auth, async (req, res) => {
  try {
    const products = await Product.find();
    const categoryMap = {};
    products.forEach(p => {
      categoryMap[p._id.toString()] = p.category;
    });
    const sales = await Sale.find();
    const categoryRevenue = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const pid = item.product?.toString();
        const cat = categoryMap[pid] || 'Other';
        categoryRevenue[cat] = (categoryRevenue[cat] || 0) + item.total;
      });
    });
    const result = Object.entries(categoryRevenue).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET monthly P&L
router.get('/pnl', auth, async (req, res) => {
  try {
    const sales = await Sale.find();
    const products = await Product.find();
    const costMap = {};
    products.forEach(p => { costMap[p._id.toString()] = p.costPrice; });

    let totalRevenue = 0, totalCost = 0;
    const productStats = {};

    sales.forEach(sale => {
      totalRevenue += sale.total;
      sale.items.forEach(item => {
        const pid = item.product?.toString();
        const cost = (costMap[pid] || 0) * item.qty;
        totalCost += cost;
        if (!productStats[item.name]) {
          productStats[item.name] = { name: item.name, revenue: 0, cost: 0, qty: 0 };
        }
        productStats[item.name].revenue += item.total;
        productStats[item.name].cost += cost;
        productStats[item.name].qty += item.qty;
      });
    });

    const productList = Object.values(productStats).map(p => ({
      ...p,
      revenue: parseFloat(p.revenue.toFixed(2)),
      cost: parseFloat(p.cost.toFixed(2)),
      margin: p.revenue > 0 ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : 0
    }));

    res.json({
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      totalProfit: parseFloat((totalRevenue - totalCost).toFixed(2)),
      avgMargin: totalRevenue > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100) : 0,
      products: productList.sort((a, b) => b.margin - a.margin)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
