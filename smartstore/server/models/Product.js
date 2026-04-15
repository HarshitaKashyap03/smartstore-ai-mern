const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  sku:         { type: String, required: true, unique: true },
  category:    { type: String, required: true },
  stock:       { type: Number, default: 0 },
  minStock:    { type: Number, default: 10 },
  price:       { type: Number, required: true },
  costPrice:   { type: Number, default: 0 },
  status:      { type: String, enum: ['In Stock', 'Low', 'Out of Stock'], default: 'In Stock' },
  totalViews:  { type: Number, default: 0 },
  lastSoldAt:  { type: Date }
}, { timestamps: true });

productSchema.pre('save', function(next) {
  if (this.stock === 0) this.status = 'Out of Stock';
  else if (this.stock <= this.minStock) this.status = 'Low';
  else this.status = 'In Stock';
  next();
});

module.exports = mongoose.model('Product', productSchema);
