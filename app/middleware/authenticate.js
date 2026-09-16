const jwt = require('jsonwebtoken');
const userStore = require('../data/userStore');

const authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = jwt.verify(token, userStore.JWT_SECRET);
    const user = await userStore.getById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = userStore.toPublicUser(user);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication required' });
  }
};

module.exports = authenticate;