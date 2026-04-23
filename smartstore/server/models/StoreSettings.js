const mongoose = require('mongoose');

const storeSettingsSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'SmartStore Tech' },
  currency: { type: String, required: true, default: 'USD ($)' },
  timezone: { type: String, required: true, default: 'UTC+5:30' },
  taxRate: { type: Number, required: true, default: 8.5 }
}, { timestamps: true });

module.exports = mongoose.model('StoreSettings', storeSettingsSchema);
