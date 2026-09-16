const fs = require('fs/promises');
const { MongoClient } = require('mongodb');
const path = require('path');

const dataFilePath = path.join(__dirname, 'policies.json');

let client;
let collection;

const hasMongo = () => Boolean(process.env.MONGO_URI);

const toPublicPolicy = (policy) => {
  if (!policy) {
    return policy;
  }

  const { _id, ...publicPolicy } = policy;
  return publicPolicy;
};

const normalizeString = (value) => String(value || '').trim();

const readPolicies = async () => {
  try {
    const raw = await fs.readFile(dataFilePath, 'utf8');
    const policies = JSON.parse(raw);
    return Array.isArray(policies) ? policies : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(dataFilePath, '[]');
      return [];
    }

    throw error;
  }
};

const writePolicies = async (policies) => {
  await fs.writeFile(dataFilePath, JSON.stringify(policies, null, 2));
};

const getCollection = async () => {
  if (!hasMongo()) {
    return null;
  }

  if (collection) {
    return collection;
  }

  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const databaseName = process.env.MONGO_DB_NAME || 'policy-claims';
  collection = client.db(databaseName).collection('policies');

  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ policyNumber: 1 }, { unique: true });

  return collection;
};

const seedIfEmpty = async () => {
  if (hasMongo()) {
    const policiesCollection = await getCollection();
    const count = await policiesCollection.countDocuments();

    if (!count) {
      const seedPolicies = await readPolicies();
      if (seedPolicies.length) {
        await policiesCollection.insertMany(seedPolicies);
      }
    }

    const policies = await policiesCollection.find({}).sort({ _id: -1 }).toArray();
    return policies.map(toPublicPolicy);
  }

  const policies = await readPolicies();
  if (!policies.length) {
    await writePolicies([]);
  }

  return policies;
};

const generateId = () => `policy-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const getAll = async () => {
  if (hasMongo()) {
    const policiesCollection = await getCollection();
    const policies = await policiesCollection.find({}).sort({ _id: -1 }).toArray();
    return policies.map(toPublicPolicy);
  }

  return readPolicies();
};

const getById = async (id) => {
  if (!id) {
    return null;
  }

  if (hasMongo()) {
    const policiesCollection = await getCollection();
    return policiesCollection.findOne({ id });
  }

  const policies = await readPolicies();
  return policies.find((policy) => policy.id === id) || null;
};

const getByNumber = async (policyNumber) => {
  const normalized = normalizeString(policyNumber);

  if (!normalized) {
    return null;
  }

  if (hasMongo()) {
    const policiesCollection = await getCollection();
    return policiesCollection.findOne({ policyNumber: normalized });
  }

  const policies = await readPolicies();
  return policies.find((policy) => normalizeString(policy.policyNumber) === normalized) || null;
};

const create = async (input) => {
  const policy = {
    id: generateId(),
    policyNumber: normalizeString(input.policyNumber),
    holderName: normalizeString(input.holderName),
    type: ['auto', 'home', 'life'].includes(input.type) ? input.type : 'auto',
    premium: Number(input.premium) || 0,
    status: ['active', 'expired', 'cancelled'].includes(input.status) ? input.status : 'active',
    effectiveDate: normalizeString(input.effectiveDate),
    expirationDate: normalizeString(input.expirationDate),
    owner: normalizeString(input.owner),
    createdAt: new Date().toISOString(),
  };

  if (hasMongo()) {
    const policiesCollection = await getCollection();
    await policiesCollection.insertOne(policy);
    return toPublicPolicy(policy);
  }

  const policies = await readPolicies();
  policies.unshift(policy);
  await writePolicies(policies);
  return policy;
};

const update = async (id, updates) => {
  if (hasMongo()) {
    const policiesCollection = await getCollection();
    const current = await policiesCollection.findOne({ id });
    if (!current) return null;

    const updated = {
      ...current,
      ...updates,
      id: current.id,
      _id: current._id,
      policyNumber: typeof updates.policyNumber === 'string' ? normalizeString(updates.policyNumber) : current.policyNumber,
      holderName: typeof updates.holderName === 'string' ? normalizeString(updates.holderName) : current.holderName,
      type: ['auto', 'home', 'life'].includes(updates.type) ? updates.type : current.type,
      premium: updates.premium !== undefined ? Number(updates.premium) || 0 : current.premium,
      status: ['active', 'expired', 'cancelled'].includes(updates.status) ? updates.status : current.status,
      effectiveDate: typeof updates.effectiveDate === 'string' ? normalizeString(updates.effectiveDate) : current.effectiveDate,
      expirationDate: typeof updates.expirationDate === 'string' ? normalizeString(updates.expirationDate) : current.expirationDate,
      owner: typeof updates.owner === 'string' ? normalizeString(updates.owner) : current.owner,
    };

    await policiesCollection.replaceOne({ id }, updated);
    return toPublicPolicy(updated);
  }

  const policies = await readPolicies();
  const index = policies.findIndex((policy) => policy.id === id);
  if (index === -1) return null;

  const current = policies[index];
  const updated = {
    ...current,
    ...updates,
    policyNumber: typeof updates.policyNumber === 'string' ? normalizeString(updates.policyNumber) : current.policyNumber,
    holderName: typeof updates.holderName === 'string' ? normalizeString(updates.holderName) : current.holderName,
    type: ['auto', 'home', 'life'].includes(updates.type) ? updates.type : current.type,
    premium: updates.premium !== undefined ? Number(updates.premium) || 0 : current.premium,
    status: ['active', 'expired', 'cancelled'].includes(updates.status) ? updates.status : current.status,
    effectiveDate: typeof updates.effectiveDate === 'string' ? normalizeString(updates.effectiveDate) : current.effectiveDate,
    expirationDate: typeof updates.expirationDate === 'string' ? normalizeString(updates.expirationDate) : current.expirationDate,
    owner: typeof updates.owner === 'string' ? normalizeString(updates.owner) : current.owner,
  };

  policies[index] = updated;
  await writePolicies(policies);
  return updated;
};

const remove = async (id) => {
  if (hasMongo()) {
    const policiesCollection = await getCollection();
    const result = await policiesCollection.deleteOne({ id });
    return result.deletedCount > 0;
  }

  const policies = await readPolicies();
  const index = policies.findIndex((policy) => policy.id === id);
  if (index === -1) return false;

  policies.splice(index, 1);
  await writePolicies(policies);
  return true;
};

module.exports = {
  dataFilePath,
  hasMongo,
  seedIfEmpty,
  getAll,
  getById,
  getByNumber,
  create,
  update,
  remove,
  toPublicPolicy,
};