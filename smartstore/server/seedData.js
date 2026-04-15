const User = require('./models/User');
const Product = require('./models/Product');
const Sale = require('./models/Sale');
const Alert = require('./models/Alert');

module.exports = async function seedData() {
  try {
    // Only seed if DB is empty
    const userCount = await User.countDocuments();
    if (userCount > 0) return;

    console.log('Seeding demo data...');

    // Create users
    const admin = await User.create({ name: 'Admin User', email: 'admin@smartstore.io', password: 'admin123', role: 'Admin' });
    await User.create({ name: 'Manager', email: 'manager@smartstore.io', password: 'manager123', role: 'Manager' });
    await User.create({ name: 'Alex', email: 'alex@smartstore.io', password: 'staff123', role: 'Staff' });

    // Create products
    const products = await Product.insertMany([
      { name: 'AI Headphones X1', sku: 'AU-HD-X1', category: 'Audio', stock: 5, minStock: 10, price: 45.00, costPrice: 30.00 },
      { name: 'VR Goggles Pro Z', sku: 'VR-GOG-Z', category: 'Gaming', stock: 0, minStock: 5, price: 310.20, costPrice: 220.00 },
      { name: 'SmartWatch Series 9', sku: 'SW-S9-A', category: 'Wearables', stock: 42, minStock: 10, price: 199.99, costPrice: 140.00 },
      { name: 'Laptop Pro', sku: 'LP-001', category: 'Electronics', stock: 85, minStock: 15, price: 199.99, costPrice: 150.00 },
      { name: 'SmartWatch X2', sku: 'SW-X2', category: 'Wearables', stock: 30, minStock: 10, price: 199.99, costPrice: 140.00 },
      { name: 'AR Pro Goggles', sku: 'AR-PRO', category: 'Gaming', stock: 25, minStock: 8, price: 549.99, costPrice: 380.00 },
      { name: 'Game Console Y', sku: 'GC-Y01', category: 'Gaming', stock: 20, minStock: 5, price: 499.00, costPrice: 350.00 },
    ]);

    // Create sample sales over last 7 days
    for (let i = 6; i >= 0; i--) {
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - i);
      const numSales = Math.floor(Math.random() * 5) + 3;
      for (let s = 0; s < numSales; s++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const subtotal = product.price * qty;
        const tax = parseFloat((subtotal * 0.08).toFixed(2));
        const total = parseFloat((subtotal + tax).toFixed(2));
        const sale = new Sale({
          items: [{ product: product._id, name: product.name, qty, unitPrice: product.price, total: subtotal }],
          subtotal: parseFloat(subtotal.toFixed(2)), tax, discount: 0, total,
          cashier: admin._id, cashierName: 'Admin User'
        });
        sale.createdAt = saleDate;
        await sale.save();
      }
    }

    // Create alerts
    await Alert.insertMany([
      { type: 'Low Stock', productName: 'AI Headphones X1', message: 'AI Headphones X1 - 5 left', status: 'PENDING', metadata: { currentStock: 5, minStock: 10 } },
      { type: 'Demand Spike', productName: 'VR Goggles Pro', message: 'VR Goggles Pro sales up 40%', status: 'REVIEW', metadata: { confidence: 88 } },
      { type: 'New Order', productName: '', message: 'Order #9871, $310.20', status: 'RESOLVED' }
    ]);

    console.log('Demo data seeded successfully!');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};
