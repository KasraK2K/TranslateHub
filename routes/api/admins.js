const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { requireAuth, requireSuperAdmin } = require('../../middleware/auth');

// All admin management routes require super_admin
router.use(requireAuth, requireSuperAdmin);

// GET /api/admins - List all admins
router.get('/', async (req, res) => {
  try {
    const admins = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/admins - Create a new admin
router.post('/', async (req, res) => {
  try {
    const { username, password, displayName, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Only super_admin can create another super_admin
    const adminRole = (role === 'super_admin') ? 'super_admin' : 'admin';

    const user = await User.create({
      username,
      password,
      displayName: displayName || username,
      role: adminRole
    });

    res.status(201).json(user.toJSON());
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    res.status(400).json({ error: error.message });
  }
});

// PUT /api/admins/:id - Update an admin
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const { displayName, role, active, password } = req.body;

    // Prevent deactivating yourself
    if (req.user._id.equals(user._id) && active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }

    // Prevent removing your own super_admin role
    if (req.user._id.equals(user._id) && role && role !== 'super_admin') {
      return res.status(400).json({ error: 'You cannot remove your own super admin role' });
    }

    if (displayName !== undefined) user.displayName = displayName;
    if (role) user.role = role;
    if (active !== undefined) user.active = active;
    if (password && password.length >= 6) user.password = password;

    await user.save();
    res.json(user.toJSON());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/admins/:id - Delete an admin
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Prevent deleting yourself
    if (req.user._id.equals(user._id)) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    await user.deleteOne();
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
