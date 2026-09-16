const errorHandler = (err, req, res, next) => {
  console.error(err);
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  const payload = { error: message };

  if (Array.isArray(err.errors) && err.errors.length) {
    payload.errors = err.errors;
  }

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
