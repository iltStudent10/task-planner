const fs = require('fs/promises');
const { MongoClient } = require('mongodb');
const path = require('path');

const dataFilePath = path.join(__dirname, 'tasks.json');

let client;
let collection;

const toPublicTask = (task) => {
  if (!task) {
    return task;
  }

  const { _id, ...publicTask } = task;
  return publicTask;
};

const readTasks = async () => {
  const raw = await fs.readFile(dataFilePath, 'utf8');
  return JSON.parse(raw);
};

const writeTasks = async (tasks) => {
  await fs.writeFile(dataFilePath, JSON.stringify(tasks, null, 2));
};

const hasMongo = () => Boolean(process.env.MONGO_URI);

const getCollection = async () => {
  if (!hasMongo()) {
    return null;
  }

  if (collection) {
    return collection;
  }

  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const databaseName = process.env.MONGO_DB_NAME || 'taskplanner';
  collection = client.db(databaseName).collection('tasks');

  await collection.createIndex({ id: 1 }, { unique: true });

  return collection;
};

const seedIfEmpty = async () => {
  if (hasMongo()) {
    const tasksCollection = await getCollection();
    const count = await tasksCollection.countDocuments();

    if (!count) {
      const seedTasks = await readTasks();
      if (seedTasks.length) {
        await tasksCollection.insertMany(seedTasks);
      }
    }

    const tasks = await tasksCollection.find({}).sort({ _id: -1 }).toArray();
    return tasks.map(toPublicTask);
  }

  const tasks = await readTasks();
  if (!tasks.length) {
    await writeTasks([]);
  }

  return tasks;
};

const generateId = () => `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const getAll = async () => {
  if (hasMongo()) {
    const tasksCollection = await getCollection();
    const tasks = await tasksCollection.find({}).sort({ _id: -1 }).toArray();
    return tasks.map(toPublicTask);
  }

  return readTasks();
};

const create = async (input) => {
  const task = {
    id: generateId(),
    title: input.title.trim(),
    category: input.category?.trim() || 'General',
    priority: ['low', 'medium', 'high'].includes(input.priority) ? input.priority : 'medium',
    dueDate: input.dueDate?.trim() || '',
    completed: Boolean(input.completed),
    notes: input.notes?.trim() || '',
  };

  if (hasMongo()) {
    const tasksCollection = await getCollection();
    await tasksCollection.insertOne(task);
    return toPublicTask(task);
  }

  const tasks = await readTasks();
  tasks.unshift(task);
  await writeTasks(tasks);
  return task;
};

const update = async (id, updates) => {
  if (hasMongo()) {
    const tasksCollection = await getCollection();
    const current = await tasksCollection.findOne({ id });
    if (!current) return null;

    const updated = {
      ...current,
      ...updates,
      id: current.id,
      _id: current._id,
      title: typeof updates.title === 'string' ? updates.title.trim() : current.title,
      category: typeof updates.category === 'string' ? updates.category.trim() : current.category,
      priority: ['low', 'medium', 'high'].includes(updates.priority) ? updates.priority : current.priority,
      dueDate: typeof updates.dueDate === 'string' ? updates.dueDate.trim() : current.dueDate,
      notes: typeof updates.notes === 'string' ? updates.notes.trim() : current.notes,
      completed: typeof updates.completed === 'boolean' ? updates.completed : current.completed,
    };

    await tasksCollection.replaceOne({ id }, updated);
    return toPublicTask(updated);
  }

  const tasks = await readTasks();
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;

  const current = tasks[index];
  const updated = {
    ...current,
    ...updates,
    title: typeof updates.title === 'string' ? updates.title.trim() : current.title,
    category: typeof updates.category === 'string' ? updates.category.trim() : current.category,
    priority: ['low', 'medium', 'high'].includes(updates.priority) ? updates.priority : current.priority,
    dueDate: typeof updates.dueDate === 'string' ? updates.dueDate.trim() : current.dueDate,
    notes: typeof updates.notes === 'string' ? updates.notes.trim() : current.notes,
  };

  tasks[index] = updated;
  await writeTasks(tasks);
  return updated;
};

const remove = async (id) => {
  if (hasMongo()) {
    const tasksCollection = await getCollection();
    const result = await tasksCollection.deleteOne({ id });
    return result.deletedCount > 0;
  }

  const tasks = await readTasks();
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  await writeTasks(tasks);
  return true;
};

module.exports = {
  dataFilePath,
  hasMongo,
  seedIfEmpty,
  getAll,
  create,
  update,
  remove,
};
