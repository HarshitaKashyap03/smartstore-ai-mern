const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// ── helper: sign token ───────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ────────────────────────────────────────────────────────────
// POST /api/auth/login
// ────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await user.comparePassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    // If a role was selected on login form, verify it matches
    if (role && user.role !== role) {
      return res.status(403).json({ message: `This account is registered as ${user.role}, not ${role}` });
    }

    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/auth/register
//
// SECURITY RULES:
//  1. If NO users exist yet → first user becomes Admin (store owner setup)
//  2. If users already exist → role is always forced to 'Staff'
//     Nobody can self-register as Admin or Manager
//     Only an existing Admin can promote users via the Admin Panel
// ────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    // Check if this is the very first user
    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? 'Admin' : 'Staff';
    // Role sent from frontend is IGNORED — server decides

    const user = await User.create({ name, email, password, role: assignedRole });
    const token = signToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      message: userCount === 0
        ? 'Store owner account created. You are the Admin.'
        : 'Account created as Staff. Contact Admin to change your role.'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/auth/users  (Admin only)
// ────────────────────────────────────────────────────────────
router.get('/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const users = await User.find({}, '-password').sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// PUT /api/auth/users/:id/role  (Admin only)
// Admin can promote Staff → Manager or Manager → Staff etc.
// ────────────────────────────────────────────────────────────
router.put('/users/:id/role', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const { role } = req.body;
    if (!['Admin', 'Manager', 'Staff'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be Admin, Manager, or Staff' });
    }
    // Prevent admin from demoting themselves
    if (req.params.id === req.user.id && role !== 'Admin') {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-password' }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user, message: `${user.name} is now ${role}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ────────────────────────────────────────────────────────────
// DELETE /api/auth/users/:id  (Admin only)
// ────────────────────────────────────────────────────────────
router.delete('/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `${user.name} deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
