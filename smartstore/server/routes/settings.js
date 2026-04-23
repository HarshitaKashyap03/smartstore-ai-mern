const router = require('express').Router();
const auth = require('../middleware/auth');
const StoreSettings = require('../models/StoreSettings');

const DEFAULT_SETTINGS = {
  name: 'SmartStore Tech',
  currency: 'USD ($)',
  timezone: 'UTC+5:30',
  taxRate: 8.5
};

async function getOrCreateSettings() {
  let settings = await StoreSettings.findOne();
  if (!settings) settings = await StoreSettings.create(DEFAULT_SETTINGS);
  return settings;
}

// GET /api/settings/store
router.get('/store', auth, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/settings/store (Admin only)
router.put('/store', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const payload = {
      name: req.body.name,
      currency: req.body.currency,
      timezone: req.body.timezone,
      taxRate: Number(req.body.taxRate)
    };

    if (!payload.name || !payload.currency || !payload.timezone || Number.isNaN(payload.taxRate)) {
      return res.status(400).json({ message: 'All fields are required and taxRate must be a number' });
    }

    const existing = await StoreSettings.findOne();
    const settings = existing
      ? await StoreSettings.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true })
      : await StoreSettings.create(payload);

    res.json({ message: 'Store settings updated', settings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
