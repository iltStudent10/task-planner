const express = require('express');
const store = require('../data/taskStore');

const router = express.Router();

const sendValidationError = (res, message) => res.status(400).json({ error: message });

router.get('/', async (req, res, next) => {
  try {
    const tasks = await store.getAll();
    const { search, category, completed } = req.query;

    let filtered = tasks;

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter((task) =>
        [task.title, task.category, task.notes, task.dueDate]
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }

    if (category) {
      filtered = filtered.filter((task) => task.category.toLowerCase() === String(category).toLowerCase());
    }

    if (completed === 'true' || completed === 'false') {
      const wanted = completed === 'true';
      filtered = filtered.filter((task) => task.completed === wanted);
    }

    return res.json({ tasks: filtered });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tasks = await store.getAll();
    const task = tasks.find((item) => item.id === req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, category, priority, dueDate, completed, notes } = req.body || {};
    if (!title || !String(title).trim()) {
      return sendValidationError(res, 'Task title is required');
    }

    const task = await store.create({ title, category, priority, dueDate, completed, notes });
    return res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { title, category, priority, dueDate, completed, notes } = req.body || {};
    if (!title || !String(title).trim()) {
      return sendValidationError(res, 'Task title is required');
    }

    const updated = await store.update(req.params.id, { title, category, priority, dueDate, completed, notes });
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    return res.status(200).json({ task: updated });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const updated = await store.update(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    return res.status(200).json({ task: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const removed = await store.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Task not found' });
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
