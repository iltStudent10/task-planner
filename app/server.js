const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const authenticate = require('./middleware/authenticate');
const authRoutes = require('./routes/authRoutes');
const policyRoutes = require('./routes/policyRoutes');
const claimRoutes = require('./routes/claimRoutes');
const policyStore = require('./data/policyStore');
const claimStore = require('./data/claimStore');
const userStore = require('./data/userStore');

const app = express();
const configuredPort = process.env.PORT ? Number(process.env.PORT) : 3000;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:8080')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const connectMongo = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.log('MongoDB not configured; using JSON file storage');
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGO_DB_NAME || 'policy-claims',
    });
    console.log('Connected to MongoDB with Mongoose');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    service: 'policy-claims-api',
    storage: policyStore.hasMongo() ? 'mongodb' : 'json-file',
    dataFile: path.basename(policyStore.dataFilePath),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);

const buildDashboard = async () => {
  const policies = await policyStore.getAll();
  const claims = await claimStore.getAll();
  const policyStatuses = {
    active: policies.filter((policy) => policy.status === 'active').length,
    expired: policies.filter((policy) => policy.status === 'expired').length,
    cancelled: policies.filter((policy) => policy.status === 'cancelled').length,
  };
  const claimStatuses = {
    submitted: claims.filter((claim) => claim.status === 'submitted').length,
    underReview: claims.filter((claim) => claim.status === 'under-review').length,
    approved: claims.filter((claim) => claim.status === 'approved').length,
    denied: claims.filter((claim) => claim.status === 'denied').length,
    closed: claims.filter((claim) => claim.status === 'closed').length,
  };

  return {
    name: 'Policy Claims Tracker',
    totalPolicies: policies.length,
    policyStatuses,
    totalClaims: claims.length,
    claimStatuses,
    claimStats: await claimStore.getStats(),
  };
};

const sendDashboard = async (req, res, next) => {
  try {
    const dashboard = await buildDashboard();
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
};

app.get('/api/dashboard', authenticate, sendDashboard);
app.get('/api/summary', authenticate, sendDashboard);

app.use('/api/policies', authenticate, policyRoutes);
app.use('/api/claims', authenticate, claimRoutes);
app.use(notFound);
app.use(errorHandler);

const start = async (port = configuredPort) => {
  await Promise.all([policyStore.seedIfEmpty(), claimStore.seedIfEmpty(), userStore.seedIfEmpty()]);

  const server = app.listen(port, () => {
    console.log(`Policy Claims API listening on port ${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && !process.env.PORT && port < 3010) {
      console.warn(`Port ${port} is busy, retrying on ${port + 1}`);
      start(port + 1).catch((startError) => {
        console.error(startError);
        process.exit(1);
      });
      return;
    }

    console.error(error);
    process.exit(1);
  });
};

connectMongo()
  .then(() => {
    start();
  })
  .catch((error) => {
    console.error('Failed to start the application:', error);
    process.exit(1);
  });
