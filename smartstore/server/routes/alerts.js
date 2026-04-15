const router = require('express').Router();
const Alert = require('../models/Alert');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { type, status } = req.query;
    let query = {};
    if (type) query.type = type;
    if (status) query.status = status;
    const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(50);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/:id/resolve', auth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { status: 'RESOLVED' }, { new: true });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await Alert.findByIdAndDelete(req.params.id);
    res.json({ message: 'Alert deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
