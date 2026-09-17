const fs = require('fs/promises');
const { MongoClient } = require('mongodb');
const path = require('path');
const policyStore = require('./policyStore');
const userStore = require('./userStore');

const dataFilePath = path.join(__dirname, 'claims.json');

let client;
let collection;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hasMongo = () => Boolean(process.env.MONGO_URI);

const formatUserIdentity = (user, fallback) => {
  if (!user) {
    return fallback;
  }

  const name = normalizeString(user.name);
  const email = normalizeString(user.email);

  if (name && email) {
    return `${name} (${email})`;
  }

  return email || name || fallback;
};

const resolveNoteAuthor = async (author) => {
  const normalizedAuthor = normalizeString(author);

  if (!normalizedAuthor) {
    return normalizedAuthor;
  }

  if (normalizedAuthor.startsWith('user-')) {
    const user = await userStore.getById(normalizedAuthor);
    if (user) {
      return formatUserIdentity(user, normalizedAuthor);
    }
  }

  if (emailPattern.test(normalizedAuthor)) {
    const user = await userStore.getByEmail(normalizedAuthor);
    if (user) {
      return formatUserIdentity(user, normalizedAuthor);
    }
  }

  return normalizedAuthor;
};

const toPublicClaim = async (claim) => {
  if (!claim) {
    return claim;
  }

  const { _id, ...publicClaim } = claim;
  const notes = Array.isArray(publicClaim.notes)
    ? await Promise.all(
      publicClaim.notes.map(async (note) => ({
        ...note,
        author: await resolveNoteAuthor(note.author),
      })),
    )
    : [];

  return {
    ...publicClaim,
    notes,
  };
};

const normalizeString = (value) => String(value || '').trim();

const readClaims = async () => {
  try {
    const raw = await fs.readFile(dataFilePath, 'utf8');
    const claims = JSON.parse(raw);
    return Array.isArray(claims) ? claims : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(dataFilePath, '[]');
      return [];
    }

    throw error;
  }
};

const writeClaims = async (claims) => {
  await fs.writeFile(dataFilePath, JSON.stringify(claims, null, 2));
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
  collection = client.db(databaseName).collection('claims');

  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ claimNumber: 1 }, { unique: true });

  return collection;
};

const seedIfEmpty = async () => {
  if (hasMongo()) {
    const claimsCollection = await getCollection();
    const count = await claimsCollection.countDocuments();

    if (!count) {
      const seedClaims = await readClaims();
      if (seedClaims.length) {
        await claimsCollection.insertMany(seedClaims);
      }
    }

    const claims = await claimsCollection.find({}).sort({ _id: -1 }).toArray();
    return Promise.all(claims.map((claim) => toPublicClaim(claim)));
  }

  const claims = await readClaims();
  if (!claims.length) {
    await writeClaims([]);
  }

  return claims;
};

const generateId = () => `claim-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const getAll = async () => {
  if (hasMongo()) {
    const claimsCollection = await getCollection();
    const claims = await claimsCollection.find({}).sort({ _id: -1 }).toArray();
    return Promise.all(claims.map((claim) => toPublicClaim(claim)));
  }

  const claims = await readClaims();
  return Promise.all(claims.map((claim) => toPublicClaim(claim)));
};

const getById = async (id) => {
  if (!id) {
    return null;
  }

  if (hasMongo()) {
    const claimsCollection = await getCollection();
    const claim = await claimsCollection.findOne({ id });
    return toPublicClaim(claim);
  }

  const claims = await readClaims();
  const claim = claims.find((claim) => claim.id === id) || null;
  return toPublicClaim(claim);
};

const getByNumber = async (claimNumber) => {
  const normalized = normalizeString(claimNumber);

  if (!normalized) {
    return null;
  }

  if (hasMongo()) {
    const claimsCollection = await getCollection();
    return claimsCollection.findOne({ claimNumber: normalized });
  }

  const claims = await readClaims();
  return claims.find((claim) => normalizeString(claim.claimNumber) === normalized) || null;
};

const create = async (input) => {
  const policy = await policyStore.getById(input.policy);
  if (!policy) {
    const error = new Error('Policy not found');
    error.statusCode = 404;
    throw error;
  }

  const claim = {
    id: generateId(),
    claimNumber: normalizeString(input.claimNumber),
    policy: normalizeString(input.policy),
    incidentDate: normalizeString(input.incidentDate),
    amount: Number(input.amount) || 0,
    description: normalizeString(input.description),
    status: ['submitted', 'under-review', 'approved', 'denied', 'closed'].includes(input.status)
      ? input.status
      : 'submitted',
    assignedTo: normalizeString(input.assignedTo),
    notes: Array.isArray(input.notes) ? input.notes : [],
    createdAt: new Date().toISOString(),
  };

  if (hasMongo()) {
    const claimsCollection = await getCollection();
    await claimsCollection.insertOne(claim);
    return toPublicClaim(claim);
  }

  const claims = await readClaims();
  claims.unshift(claim);
  await writeClaims(claims);
  return toPublicClaim(claim);
};

const update = async (id, updates) => {
  if (hasMongo()) {
    const claimsCollection = await getCollection();
    const current = await claimsCollection.findOne({ id });
    if (!current) return null;

    const nextPolicyId = typeof updates.policy === 'string' ? normalizeString(updates.policy) : current.policy;
    if (typeof updates.policy === 'string') {
      const linkedPolicy = await policyStore.getById(nextPolicyId);
      if (!linkedPolicy) {
        const error = new Error('Policy not found');
        error.statusCode = 404;
        throw error;
      }
    }

    const updated = {
      ...current,
      ...updates,
      id: current.id,
      _id: current._id,
      claimNumber: typeof updates.claimNumber === 'string' ? normalizeString(updates.claimNumber) : current.claimNumber,
      policy: nextPolicyId,
      incidentDate: typeof updates.incidentDate === 'string' ? normalizeString(updates.incidentDate) : current.incidentDate,
      amount: updates.amount !== undefined ? Number(updates.amount) || 0 : current.amount,
      description: typeof updates.description === 'string' ? normalizeString(updates.description) : current.description,
      status: ['submitted', 'under-review', 'approved', 'denied', 'closed'].includes(updates.status)
        ? updates.status
        : current.status,
      assignedTo: typeof updates.assignedTo === 'string' ? normalizeString(updates.assignedTo) : current.assignedTo,
      notes: Array.isArray(updates.notes) ? updates.notes : current.notes,
    };

    await claimsCollection.replaceOne({ id }, updated);
    return toPublicClaim(updated);
  }

  const claims = await readClaims();
  const index = claims.findIndex((claim) => claim.id === id);
  if (index === -1) return null;

  const current = claims[index];
  const nextPolicyId = typeof updates.policy === 'string' ? normalizeString(updates.policy) : current.policy;
  if (typeof updates.policy === 'string') {
    const linkedPolicy = await policyStore.getById(nextPolicyId);
    if (!linkedPolicy) {
      const error = new Error('Policy not found');
      error.statusCode = 404;
      throw error;
    }
  }

  const updated = {
    ...current,
    ...updates,
    claimNumber: typeof updates.claimNumber === 'string' ? normalizeString(updates.claimNumber) : current.claimNumber,
    policy: nextPolicyId,
    incidentDate: typeof updates.incidentDate === 'string' ? normalizeString(updates.incidentDate) : current.incidentDate,
    amount: updates.amount !== undefined ? Number(updates.amount) || 0 : current.amount,
    description: typeof updates.description === 'string' ? normalizeString(updates.description) : current.description,
    status: ['submitted', 'under-review', 'approved', 'denied', 'closed'].includes(updates.status)
      ? updates.status
      : current.status,
    assignedTo: typeof updates.assignedTo === 'string' ? normalizeString(updates.assignedTo) : current.assignedTo,
    notes: Array.isArray(updates.notes) ? updates.notes : current.notes,
  };

  claims[index] = updated;
  await writeClaims(claims);
  return toPublicClaim(updated);
};

const addNote = async (id, noteInput) => {
  const note = {
    author: normalizeString(noteInput.author),
    text: normalizeString(noteInput.text),
    createdAt: new Date().toISOString(),
  };

  if (!note.text) {
    return null;
  }

  if (hasMongo()) {
    const claimsCollection = await getCollection();
    const current = await claimsCollection.findOne({ id });
    if (!current) return null;

    const notes = Array.isArray(current.notes) ? current.notes : [];
    const updated = { ...current, notes: [...notes, note], _id: current._id };
    await claimsCollection.replaceOne({ id }, updated);
    return toPublicClaim(updated);
  }

  const claims = await readClaims();
  const index = claims.findIndex((claim) => claim.id === id);
  if (index === -1) return null;

  const current = claims[index];
  const notes = Array.isArray(current.notes) ? current.notes : [];
  const updated = { ...current, notes: [...notes, note] };
  claims[index] = updated;
  await writeClaims(claims);
  return toPublicClaim(updated);
};

const remove = async (id) => {
  if (hasMongo()) {
    const claimsCollection = await getCollection();
    const result = await claimsCollection.deleteOne({ id });
    return result.deletedCount > 0;
  }

  const claims = await readClaims();
  const index = claims.findIndex((claim) => claim.id === id);
  if (index === -1) return false;

  claims.splice(index, 1);
  await writeClaims(claims);
  return true;
};

const getStats = async () => {
  const claims = await getAll();
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

module.exports = {
  dataFilePath,
  hasMongo,
  seedIfEmpty,
  getAll,
  getById,
  getByNumber,
  create,
  update,
  addNote,
  remove,
  getStats,
  toPublicClaim,
};