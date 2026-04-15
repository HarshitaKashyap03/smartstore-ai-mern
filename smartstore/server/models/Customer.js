const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  sessionId:   { type: String, unique: true },
  viewedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  purchasedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  totalSpent:  { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
