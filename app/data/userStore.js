const fs = require('fs/promises');
const { MongoClient } = require('mongodb');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataFilePath = path.join(__dirname, 'users.json');

let client;
let collection;

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'task-planner-dev-secret');

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set when NODE_ENV=production');
}

const hasMongo = () => Boolean(process.env.MONGO_URI);

const generateId = () => `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const toPublicUser = (user) => {
  if (!user) {
    return user;
  }

  const { _id, passwordHash, ...publicUser } = user;
  return publicUser;
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const readUsers = async () => {
  try {
    const raw = await fs.readFile(dataFilePath, 'utf8');
    const users = JSON.parse(raw);
    return Array.isArray(users) ? users : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(dataFilePath, '[]');
      return [];
    }

    throw error;
  }
};

const writeUsers = async (users) => {
  await fs.writeFile(dataFilePath, JSON.stringify(users, null, 2));
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
  collection = client.db(databaseName).collection('users');

  await collection.createIndex({ email: 1 }, { unique: true });

  return collection;
};

const seedIfEmpty = async () => {
  if (hasMongo()) {
    const usersCollection = await getCollection();
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    return usersCollection.find({}).sort({ _id: -1 }).toArray();
  }

  const users = await readUsers();
  if (!users.length) {
    await writeUsers([]);
  }

  return users;
};

const getAll = async () => {
  if (hasMongo()) {
    const usersCollection = await getCollection();
    return usersCollection.find({}).sort({ _id: -1 }).toArray();
  }

  return readUsers();
};

const getByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  if (hasMongo()) {
    const usersCollection = await getCollection();
    return usersCollection.findOne({ email: normalizedEmail });
  }

  const users = await readUsers();
  return users.find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
};

const getById = async (id) => {
  if (!id) {
    return null;
  }

  if (hasMongo()) {
    const usersCollection = await getCollection();
    return usersCollection.findOne({ id });
  }

  const users = await readUsers();
  return users.find((user) => user.id === id) || null;
};

const create = async ({ name, email, password, role = 'user' }) => {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(password, 10);

  const user = {
    id: generateId(),
    name: String(name || '').trim(),
    email: normalizedEmail,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  };

  if (hasMongo()) {
    const usersCollection = await getCollection();
    await usersCollection.insertOne(user);
    return toPublicUser(user);
  }

  const users = await readUsers();
  users.unshift(user);
  await writeUsers(users);
  return toPublicUser(user);
};

const verifyCredentials = async ({ email, password }) => {
  const user = await getByEmail(email);

  if (!user) {
    return null;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash || '');
  if (!passwordMatch) {
    return null;
  }

  return toPublicUser(user);
};

module.exports = {
  dataFilePath,
  hasMongo,
  seedIfEmpty,
  getAll,
  getByEmail,
  getById,
  create,
  verifyCredentials,
  toPublicUser,
  JWT_SECRET,
};