const { validationResult } = require('express-validator');
const createHttpError = require('./httpError');

const handleValidationErrors = (req, res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const error = createHttpError(400, 'Validation failed');
  error.errors = result.array().map(({ type, value, msg, path, location }) => ({
    type,
    value,
    message: msg,
    field: path,
    location,
  }));

  return next(error);
};

module.exports = handleValidationErrors;