const router = require('express').Router();
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');

// GET /api/alerts
// Returns all alerts sorted: PENDING -> REVIEW -> RESOLVED
// Supports query filters: ?type=Low Stock  ?status=PENDING  ?search=keyword
router.get('/', auth, async (req, res) => {
  try {
    const { type, status, search } = req.query;
    let query = {};
    if (type   && type   !== 'All') query.type   = type;
    if (status && status !== 'All') query.status = status;
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: 'i' } },
        { message:     { $regex: search, $options: 'i' } },
      ];
    }

    const alerts = await Alert.find(query).limit(100);

    // Sort: PENDING first -> REVIEW -> RESOLVED, newest first within each group
    const priority = { PENDING: 0, REVIEW: 1, RESOLVED: 2 };
    alerts.sort((a, b) => {
      const pd = priority[a.status] - priority[b.status];
      if (pd !== 0) return pd;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/alerts/count
// Returns counts by status — used by topbar notification badge
router.get('/count', auth, async (req, res) => {
  try {
    const pending  = await Alert.countDocuments({ status: 'PENDING' });
    const review   = await Alert.countDocuments({ status: 'REVIEW'  });
    const resolved = await Alert.countDocuments({ status: 'RESOLVED'});
    res.json({ pending, review, resolved, total: pending + review + resolved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/alerts/:id
// Returns a single alert by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/alerts
// Manually create an alert
// Body: { type, productName, message, metadata }
router.post('/', auth, async (req, res) => {
  try {
    const { type, product, productName, message, metadata } = req.body;
    if (!type || !message) {
      return res.status(400).json({ message: 'type and message are required' });
    }
    const alert = await Alert.create({
      type,
      product:     product || undefined,
      productName: productName || '',
      message,
      metadata:    metadata || {},
      status:      'PENDING',
    });
    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/alerts/:id/resolve
// Mark a single alert as RESOLVED
router.patch('/:id/resolve', auth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'RESOLVED' },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/alerts/:id/review
// Mark a single alert as REVIEW (acknowledged but not fully resolved)
router.patch('/:id/review', auth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'REVIEW' },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/alerts/:id/reopen
// Reopen a RESOLVED alert back to PENDING
router.patch('/:id/reopen', auth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: 'PENDING' },
      { new: true }
    );
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/alerts/resolve-all/pending
// Resolve ALL pending alerts in one click
router.patch('/resolve-all/pending', auth, async (req, res) => {
  try {
    const result = await Alert.updateMany(
      { status: 'PENDING' },
      { status: 'RESOLVED' }
    );
    res.json({ message: result.modifiedCount + ' alerts resolved' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/alerts/:id
// Delete a single alert permanently
router.delete('/:id', auth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });
    res.json({ message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/alerts/clear/resolved
// Delete ALL resolved alerts to clean up the list
router.delete('/clear/resolved', auth, async (req, res) => {
  try {
    const result = await Alert.deleteMany({ status: 'RESOLVED' });
    res.json({ message: result.deletedCount + ' resolved alerts cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
