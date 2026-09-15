const fs = require('fs/promises');
const path = require('path');

const dataFilePath = path.join(__dirname, 'tasks.json');

const readTasks = async () => {
  const raw = await fs.readFile(dataFilePath, 'utf8');
  return JSON.parse(raw);
};

const writeTasks = async (tasks) => {
  await fs.writeFile(dataFilePath, JSON.stringify(tasks, null, 2));
};

const seedIfEmpty = async () => {
  const tasks = await readTasks();
  if (!tasks.length) {
    await writeTasks([]);
  }
  return tasks;
};

const generateId = () => `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const getAll = async () => readTasks();

const create = async (input) => {
  const tasks = await readTasks();
  const task = {
    id: generateId(),
    title: input.title.trim(),
    category: input.category?.trim() || 'General',
    priority: ['low', 'medium', 'high'].includes(input.priority) ? input.priority : 'medium',
    dueDate: input.dueDate?.trim() || '',
    completed: Boolean(input.completed),
    notes: input.notes?.trim() || '',
  };

  tasks.unshift(task);
  await writeTasks(tasks);
  return task;
};

const update = async (id, updates) => {
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
  const tasks = await readTasks();
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return false;

  tasks.splice(index, 1);
  await writeTasks(tasks);
  return true;
};

module.exports = {
  dataFilePath,
  seedIfEmpty,
  getAll,
  create,
  update,
  remove,
};
