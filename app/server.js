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
const configuredPort = process.env.PORT ? Number(process.env.PORT) : 4000;
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000,http://localhost:8080,http://localhost:30080')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME || 'policy-claims';

const connectMongo = async () => {
  if (!mongoUri) {
    console.log('MongoDB not configured; using JSON file storage');
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: mongoDbName,
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

app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

const normalizeOwnershipValue = (value) => String(value || '').trim().toLowerCase();

const userOwnsRecord = (owner, user) => {
  const normalizedOwner = normalizeOwnershipValue(owner);

  if (!normalizedOwner || !user) {
    return false;
  }

  return [user.id, user.name, user.email].some((candidate) => normalizeOwnershipValue(candidate) === normalizedOwner);
};

const filterPoliciesForUser = (policies, user) => {
  if (user?.role === 'admin') {
    return policies;
  }

  return policies.filter((policy) => userOwnsRecord(policy.owner, user));
};

const filterClaimsForUser = (claims, policies, user) => {
  if (user?.role === 'admin') {
    return claims;
  }

  const visiblePolicyIds = new Set(filterPoliciesForUser(policies, user).map((policy) => policy.id));
  return claims.filter((claim) => visiblePolicyIds.has(claim.policy));
};

const buildClaimStats = (claims) => {
  const totalAmount = claims.reduce((sum, claim) => sum + (Number(claim.amount) || 0), 0);

  return {
    totalClaims: claims.length,
    submittedClaims: claims.filter((claim) => claim.status === 'submitted').length,
    underReviewClaims: claims.filter((claim) => claim.status === 'under-review').length,
    approvedClaims: claims.filter((claim) => claim.status === 'approved').length,
    deniedClaims: claims.filter((claim) => claim.status === 'denied').length,
    closedClaims: claims.filter((claim) => claim.status === 'closed').length,
    totalAmount,
    averageAmount: claims.length ? totalAmount / claims.length : 0,
  };
};

const buildDashboard = async (user) => {
  const allPolicies = await policyStore.getAll();
  const allClaims = await claimStore.getAll();
  const policies = filterPoliciesForUser(allPolicies, user);
  const claims = filterClaimsForUser(allClaims, allPolicies, user);
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
    claimStats: buildClaimStats(claims),
  };
};

const sendDashboard = async (req, res, next) => {
  try {
    const dashboard = await buildDashboard(req.user);
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

  return server;
};

if (require.main === module) {
  connectMongo()
    .then(() => {
      start();
    })
    .catch((error) => {
      console.error('Failed to start the application:', error);
      process.exit(1);
    });
}

module.exports = { app, start, connectMongo };
