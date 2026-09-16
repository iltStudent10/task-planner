const jwt = require('jsonwebtoken');
const userStore = require('../data/userStore');
const createHttpError = require('./httpError');

const authenticate = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

    if (!token) {
      throw createHttpError(401, 'Authentication required');
    }

    const payload = jwt.verify(token, userStore.JWT_SECRET);
    const user = await userStore.getById(payload.sub);

    if (!user) {
      throw createHttpError(401, 'Authentication required');
    }

    req.user = userStore.toPublicUser(user);
    next();
  } catch (error) {
    if (error && error.statusCode) {
      return next(error);
    }

    return next(createHttpError(401, 'Authentication required'));
  }
};

module.exports = authenticate;