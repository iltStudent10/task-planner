const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const userStore = require('../data/userStore');
const authenticate = require('../middleware/authenticate');
const handleValidationErrors = require('../middleware/handleValidationErrors');

const router = express.Router();

const buildToken = (user) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    userStore.JWT_SECRET,
    { expiresIn: '7d' },
  );

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Email must be a valid email address').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role').optional().isIn(['adjuster', 'admin']).withMessage('Role must be adjuster or admin'),
    handleValidationErrors,
  ],
  async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {};

    const existing = await userStore.getByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const user = await userStore.create({ name, email, password, role });
    const token = buildToken(user);

    return res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
  },
);

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Email must be a valid email address').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
  ],
  async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    const user = await userStore.verifyCredentials({ email, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = buildToken(user);
    return res.json({ user, token });
  } catch (error) {
    next(error);
  }
  },
);

router.get('/me', authenticate, async (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;