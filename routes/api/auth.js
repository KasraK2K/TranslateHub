const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { generateToken, requireAuth } = require('../../middleware/auth');

// GET /api/auth/status - Check if setup is needed (any super_admin exists?)
router.get('/status', async (req, res) => {
  try {
    const superAdminCount = await User.countDocuments({ role: 'super_admin' });
    res.json({
      needsSetup: superAdminCount === 0,
      initialized: superAdminCount > 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/setup - Create the first super admin (only works when no admins exist)
router.post('/setup', async (req, res) => {
  try {
    const existingAdmin = await User.countDocuments({ role: 'super_admin' });
    if (existingAdmin > 0) {
      return res.status(403).json({ error: 'Setup already completed. Super admin already exists.' });
    }

    const { username, password, displayName } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await User.create({
      username,
      password,
      displayName: displayName || username,
      role: 'super_admin'
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    res.status(400).json({ error: error.message });
  }
});

// POST /api/auth/login - Login with username and password
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!user.active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact your administrator.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: user.toJSON()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

// PUT /api/auth/password - Change own password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    req.user.password = newPassword;
    await req.user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
