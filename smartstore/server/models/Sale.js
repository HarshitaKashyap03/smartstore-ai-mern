const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  receiptNumber: { type: String, unique: true },
  items: [{
    product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name:      String,
    qty:       Number,
    unitPrice: Number,
    total:     Number
  }],
  subtotal:   Number,
  tax:        Number,
  discount:   { type: Number, default: 0 },
  total:      Number,
  cashier:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cashierName: String,
  status:     { type: String, default: 'RESOLVED' }
}, { timestamps: true });

saleSchema.pre('save', function(next) {
  if (!this.receiptNumber) {
    this.receiptNumber = 'TXN' + Date.now();
  }
  next();
});

module.exports = mongoose.model('Sale', saleSchema);
