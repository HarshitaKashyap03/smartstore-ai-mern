const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type:      { type: String, enum: ['Low Stock', 'Overstock', 'Non-Selling', 'Demand Spike', 'New Order'], required: true },
  product:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,
  message:   String,
  status:    { type: String, enum: ['PENDING', 'RESOLVED', 'REVIEW'], default: 'PENDING' },
  metadata:  { type: Object, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
