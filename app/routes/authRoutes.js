const express = require('express');
const jwt = require('jsonwebtoken');
const userStore = require('../data/userStore');
const authenticate = require('../middleware/authenticate');

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

const sendValidationError = (res, message) => res.status(400).json({ error: message });

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !String(name).trim()) {
      return sendValidationError(res, 'Name is required');
    }

    if (!email || !String(email).trim()) {
      return sendValidationError(res, 'Email is required');
    }

    if (!password || String(password).length < 8) {
      return sendValidationError(res, 'Password must be at least 8 characters');
    }

    const existing = await userStore.getByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const user = await userStore.create({ name, email, password });
    const token = buildToken(user);

    return res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !String(email).trim()) {
      return sendValidationError(res, 'Email is required');
    }

    if (!password) {
      return sendValidationError(res, 'Password is required');
    }

    const user = await userStore.verifyCredentials({ email, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = buildToken(user);
    return res.json({ user, token });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, async (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;