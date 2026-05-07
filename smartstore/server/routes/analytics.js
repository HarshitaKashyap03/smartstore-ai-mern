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

    const allProducts = await Product.find({});
    const lowStockCount = allProducts.filter(p => p.stock <= p.minStock).length;
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
    const sales    = await Sale.find();
    const products = await Product.find();
 
    // Build TWO lookup maps — by ID and by name
    // Name lookup is the reliable fallback since item.name
    // is always stored as a plain string in every sale
    const costMapById   = {};
    const costMapByName = {};
    products.forEach(p => {
      costMapById[p._id.toString()]                  = p.costPrice || 0;
      costMapByName[p.name.toLowerCase().trim()]     = p.costPrice || 0;
    });
 
    // Helper: get cost price using ID first, name as fallback
    const getCostPrice = (item) => {
      const byId   = item.product ? costMapById[item.product.toString()] : undefined;
      const byName = costMapByName[item.name?.toLowerCase().trim()];
      // Use whichever is defined and non-zero
      if (byId !== undefined) return byId;
      if (byName !== undefined) return byName;
      return 0;
    };
 
    let totalRevenue = 0;
    let totalCost    = 0;
    const productStats = {};
 
    sales.forEach(sale => {
      totalRevenue += sale.total || 0;
      sale.items.forEach(item => {
        const costPrice = getCostPrice(item);
        const itemCost  = costPrice * item.qty;
        totalCost += itemCost;
 
        const key = item.name;
        if (!productStats[key]) {
          productStats[key] = { name: key, revenue: 0, cost: 0, qty: 0 };
        }
        productStats[key].revenue += item.total || (item.unitPrice * item.qty) || 0;
        productStats[key].cost    += itemCost;
        productStats[key].qty     += item.qty;
      });
    });
 
    const productList = Object.values(productStats).map(p => ({
      name:    p.name,
      revenue: parseFloat(p.revenue.toFixed(2)),
      cost:    parseFloat(p.cost.toFixed(2)),
      qty:     p.qty,
      // Margin per product
      margin:  p.revenue > 0
        ? Math.round(((p.revenue - p.cost) / p.revenue) * 100)
        : 0,
    }));
 
    // Overall average margin from totals — most accurate
    const avgMargin = totalRevenue > 0
      ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100)
      : 0;
 
    res.json({
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCost:    parseFloat(totalCost.toFixed(2)),
      totalProfit:  parseFloat((totalRevenue - totalCost).toFixed(2)),
      avgMargin,
      products:     productList.sort((a, b) => b.margin - a.margin),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
 

// GET /api/analytics/revenue-summary
// Returns Today, Yesterday, This Week, This Month revenue + orders + change %
router.get('/revenue-summary', auth, async (req, res) => {
  try {
    const now = new Date();

    // Today
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const todayEnd   = new Date(now); todayEnd.setHours(23,59,59,999);
    const todaySales = await Sale.find({ createdAt: { $gte: todayStart, $lte: todayEnd } });
    const todayRev   = todaySales.reduce((s, sale) => s + sale.total, 0);

    // Yesterday
    const yday      = new Date(now); yday.setDate(yday.getDate() - 1);
    const ydayStart = new Date(yday); ydayStart.setHours(0,0,0,0);
    const ydayEnd   = new Date(yday); ydayEnd.setHours(23,59,59,999);
    const ydaySales = await Sale.find({ createdAt: { $gte: ydayStart, $lte: ydayEnd } });
    const ydayRev   = ydaySales.reduce((s, sale) => s + sale.total, 0);

    // This Week (Mon to today)
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0,0,0,0);
    const weekSales = await Sale.find({ createdAt: { $gte: weekStart, $lte: todayEnd } });
    const weekRev   = weekSales.reduce((s, sale) => s + sale.total, 0);

    // Last Week (for comparison)
    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd   = new Date(weekStart); lastWeekEnd.setMilliseconds(-1);
    const lastWeekSales = await Sale.find({ createdAt: { $gte: lastWeekStart, $lte: lastWeekEnd } });
    const lastWeekRev   = lastWeekSales.reduce((s, sale) => s + sale.total, 0);

    // This Month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthSales = await Sale.find({ createdAt: { $gte: monthStart, $lte: todayEnd } });
    const monthRev   = monthSales.reduce((s, sale) => s + sale.total, 0);

    // Last Month (for comparison)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const lastMonthSales = await Sale.find({ createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } });
    const lastMonthRev   = lastMonthSales.reduce((s, sale) => s + sale.total, 0);

    const pct = (curr, prev) => prev > 0 ? parseFloat(((curr - prev) / prev * 100).toFixed(1)) : 0;
    const fmt = v => parseFloat(v.toFixed(2));

    res.json({
      today:     { revenue: fmt(todayRev),  orders: todaySales.length,  change: pct(todayRev, ydayRev),       vsLabel: 'vs yesterday'  },
      yesterday: { revenue: fmt(ydayRev),   orders: ydaySales.length,   change: null,                         vsLabel: ''              },
      thisWeek:  { revenue: fmt(weekRev),   orders: weekSales.length,   change: pct(weekRev, lastWeekRev),    vsLabel: 'vs last week'  },
      thisMonth: { revenue: fmt(monthRev),  orders: monthSales.length,  change: pct(monthRev, lastMonthRev),  vsLabel: 'vs last month' },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/today-pnl', auth, async (req, res) => {
  try {
    const start = new Date(); start.setHours(0,0,0,0);
    const end   = new Date(); end.setHours(23,59,59,999);

    const todaySales = await Sale.find({ createdAt: { $gte: start, $lte: end } });

    // Get all products to look up costPrice
    const Product = require('../models/Product');
    const products = await Product.find({});
    const costMap  = {};
    products.forEach(p => { costMap[p._id.toString()] = p.costPrice || 0; });

    let todayRevenue = 0;
    let todayCost    = 0;

    todaySales.forEach(sale => {
      sale.items.forEach(item => {
        const revenue = item.unitPrice * item.qty;
        const cost    = (costMap[item.product?.toString()] || 0) * item.qty;
        todayRevenue += revenue;
        todayCost    += cost;
      });
    });

    res.json({
      todayRevenue: parseFloat(todayRevenue.toFixed(2)),
      todayCost:    parseFloat(todayCost.toFixed(2)),
      todayProfit:  parseFloat((todayRevenue - todayCost).toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

