const express = require('express');
const { body } = require('express-validator');
const store = require('../data/taskStore');
const handleValidationErrors = require('../middleware/handleValidationErrors');

const router = express.Router();

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

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('category').optional({ nullable: true }).isString().withMessage('Category must be a string'),
    body('priority').optional({ nullable: true }).isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
    body('dueDate').optional({ nullable: true }).isISO8601().withMessage('Due date must be a valid date'),
    body('completed').optional({ nullable: true }).isBoolean().withMessage('Completed must be a boolean'),
    body('notes').optional({ nullable: true }).isString().withMessage('Notes must be a string'),
    handleValidationErrors,
  ],
  async (req, res, next) => {
  try {
    const { title, category, priority, dueDate, completed, notes } = req.body || {};

    const task = await store.create({ title, category, priority, dueDate, completed, notes });
    return res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
  },
);

router.put(
  '/:id',
  [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('category').optional({ nullable: true }).isString().withMessage('Category must be a string'),
    body('priority').optional({ nullable: true }).isIn(['low', 'medium', 'high']).withMessage('Priority must be low, medium, or high'),
    body('dueDate').optional({ nullable: true }).isISO8601().withMessage('Due date must be a valid date'),
    body('completed').optional({ nullable: true }).isBoolean().withMessage('Completed must be a boolean'),
    body('notes').optional({ nullable: true }).isString().withMessage('Notes must be a string'),
    handleValidationErrors,
  ],
  async (req, res, next) => {
  try {
    const { title, category, priority, dueDate, completed, notes } = req.body || {};

    const updated = await store.update(req.params.id, { title, category, priority, dueDate, completed, notes });
    if (!updated) return res.status(404).json({ error: 'Task not found' });
    return res.status(200).json({ task: updated });
  } catch (error) {
    next(error);
  }
  },
);

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
