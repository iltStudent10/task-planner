const express = require('express');
const { body } = require('express-validator');
const store = require('../data/claimStore');
const handleValidationErrors = require('../middleware/handleValidationErrors');

const router = express.Router();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

router.get('/stats', async (req, res, next) => {
  try {
    const stats = await store.getStats();
    return res.json({ stats });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const claims = await store.getAll();
    const { search, status, policy, assignedTo, page = '1', limit = '20' } = req.query;

    let filtered = claims;

    if (search) {
      const term = String(search).toLowerCase();
      filtered = filtered.filter((claim) =>
        [claim.claimNumber, claim.description, claim.status, claim.incidentDate, String(claim.amount), claim.policy]
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }

    if (status) {
      filtered = filtered.filter((claim) => claim.status === status);
    }

    if (policy) {
      filtered = filtered.filter((claim) => claim.policy === String(policy));
    }

    if (assignedTo) {
      filtered = filtered.filter((claim) => claim.assignedTo === String(assignedTo));
    }

    const resolvedPage = parsePositiveInt(page, 1);
    const resolvedLimit = parsePositiveInt(limit, 20);
    const start = (resolvedPage - 1) * resolvedLimit;

    return res.json({
      claims: filtered.slice(start, start + resolvedLimit),
      page: resolvedPage,
      limit: resolvedLimit,
      total: filtered.length,
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  [
    body('claimNumber').trim().notEmpty().withMessage('Claim number is required'),
    body('policy').trim().notEmpty().withMessage('Policy reference is required'),
    body('incidentDate').isISO8601().withMessage('Incident date must be a valid date'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a valid number'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('status').optional({ nullable: true }).isIn(['submitted', 'under-review', 'approved', 'denied', 'closed']).withMessage('Status must be submitted, under-review, approved, denied, or closed'),
    body('assignedTo').optional({ nullable: true }).isString().withMessage('Assigned to must be a string'),
    handleValidationErrors,
  ],
  async (req, res, next) => {
  try {
    const { claimNumber, policy, incidentDate, amount, description, status, assignedTo, notes } = req.body || {};

    const existing = await store.getByNumber(claimNumber);
    if (existing) {
      return res.status(409).json({ error: 'Claim number already exists' });
    }

    const claim = await store.create({
      claimNumber,
      policy,
      incidentDate,
      amount,
      description,
      status,
      assignedTo,
      notes,
    });

    return res.status(201).json({ claim });
  } catch (error) {
    next(error);
  }
  },
);

router.get('/:id', async (req, res, next) => {
  try {
    const claim = await store.getById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });
    return res.json({ claim });
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:id',
  [
    body('claimNumber').trim().notEmpty().withMessage('Claim number is required'),
    body('policy').trim().notEmpty().withMessage('Policy reference is required'),
    body('incidentDate').isISO8601().withMessage('Incident date must be a valid date'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a valid number'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('status').optional({ nullable: true }).isIn(['submitted', 'under-review', 'approved', 'denied', 'closed']).withMessage('Status must be submitted, under-review, approved, denied, or closed'),
    body('assignedTo').optional({ nullable: true }).isString().withMessage('Assigned to must be a string'),
    handleValidationErrors,
  ],
  async (req, res, next) => {
  try {
    const { claimNumber, policy, incidentDate, amount, description, status, assignedTo, notes } = req.body || {};

    const updated = await store.update(req.params.id, {
      claimNumber,
      policy,
      incidentDate,
      amount,
      description,
      status,
      assignedTo,
      notes,
    });

    if (!updated) return res.status(404).json({ error: 'Claim not found' });
    return res.status(200).json({ claim: updated });
  } catch (error) {
    next(error);
  }
  },
);

router.post(
  '/:id/notes',
  [body('text').trim().notEmpty().withMessage('Note text is required'), handleValidationErrors],
  async (req, res, next) => {
  try {
    const { text } = req.body || {};
    const author = req.user?.name && req.user?.email
      ? `${req.user.name} (${req.user.email})`
      : req.user?.email || req.user?.name || req.user?.id;

    const updated = await store.addNote(req.params.id, { author, text });
    if (!updated) return res.status(404).json({ error: 'Claim not found' });
    return res.status(201).json({ claim: updated });
  } catch (error) {
    next(error);
  }
  },
);

router.delete('/:id', async (req, res, next) => {
  try {
    const removed = await store.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Claim not found' });
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;