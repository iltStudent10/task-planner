const express = require('express');
const { body } = require('express-validator');
const store = require('../data/policyStore');
const handleValidationErrors = require('../middleware/handleValidationErrors');

const router = express.Router();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

router.get('/', async (req, res, next) => {
  try {
    const policies = await store.getAll();
    const { search, status, type, owner, page = '1', limit = '20' } = req.query;

    let filtered = policies;

    if (search) {
      const term = String(search).toLowerCase();
      filtered = filtered.filter((policy) =>
        [policy.policyNumber, policy.holderName, policy.type, policy.status, policy.effectiveDate, policy.expirationDate]
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }

    if (status) {
      filtered = filtered.filter((policy) => policy.status === status);
    }

    if (type) {
      filtered = filtered.filter((policy) => policy.type === type);
    }

    if (owner) {
      filtered = filtered.filter((policy) => policy.owner === String(owner));
    }

    const resolvedPage = parsePositiveInt(page, 1);
    const resolvedLimit = parsePositiveInt(limit, 20);
    const start = (resolvedPage - 1) * resolvedLimit;

    return res.json({
      policies: filtered.slice(start, start + resolvedLimit),
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
    body('policyNumber').trim().notEmpty().withMessage('Policy number is required'),
    body('holderName').trim().notEmpty().withMessage('Holder name is required'),
    body('type').isIn(['auto', 'home', 'life']).withMessage('Policy type must be auto, home, or life'),
    body('premium').isFloat({ min: 0 }).withMessage('Premium must be a valid number'),
    body('status').optional({ nullable: true }).isIn(['active', 'expired', 'cancelled']).withMessage('Status must be active, expired, or cancelled'),
    body('effectiveDate').optional({ nullable: true }).isISO8601().withMessage('Effective date must be a valid date'),
    body('expirationDate').optional({ nullable: true }).isISO8601().withMessage('Expiration date must be a valid date'),
    body('owner').optional({ nullable: true }).isString().withMessage('Owner must be a string'),
    handleValidationErrors,
  ],
  async (req, res, next) => {
  try {
    const { policyNumber, holderName, type, premium, status, effectiveDate, expirationDate, owner } = req.body || {};

    const existing = await store.getByNumber(policyNumber);
    if (existing) {
      return res.status(409).json({ error: 'Policy number already exists' });
    }

    const policy = await store.create({
      policyNumber,
      holderName,
      type,
      premium,
      status,
      effectiveDate,
      expirationDate,
      owner: owner || req.user.id,
    });

    return res.status(201).json({ policy });
  } catch (error) {
    next(error);
  }
  },
);

router.get('/:id', async (req, res, next) => {
  try {
    const policy = await store.getById(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    return res.json({ policy });
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:id',
  [
    body('policyNumber').trim().notEmpty().withMessage('Policy number is required'),
    body('holderName').trim().notEmpty().withMessage('Holder name is required'),
    body('type').isIn(['auto', 'home', 'life']).withMessage('Policy type must be auto, home, or life'),
    body('premium').isFloat({ min: 0 }).withMessage('Premium must be a valid number'),
    body('status').optional({ nullable: true }).isIn(['active', 'expired', 'cancelled']).withMessage('Status must be active, expired, or cancelled'),
    body('effectiveDate').optional({ nullable: true }).isISO8601().withMessage('Effective date must be a valid date'),
    body('expirationDate').optional({ nullable: true }).isISO8601().withMessage('Expiration date must be a valid date'),
    body('owner').optional({ nullable: true }).isString().withMessage('Owner must be a string'),
    handleValidationErrors,
  ],
  async (req, res, next) => {
  try {
    const { policyNumber, holderName, type, premium, status, effectiveDate, expirationDate, owner } = req.body || {};

    const updated = await store.update(req.params.id, {
      policyNumber,
      holderName,
      type,
      premium,
      status,
      effectiveDate,
      expirationDate,
      owner,
    });

    if (!updated) return res.status(404).json({ error: 'Policy not found' });
    return res.status(200).json({ policy: updated });
  } catch (error) {
    next(error);
  }
  },
);

router.delete('/:id', async (req, res, next) => {
  try {
    const removed = await store.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Policy not found' });
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;