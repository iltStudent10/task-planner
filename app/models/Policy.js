const mongoose = require('mongoose');

const policySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    policyNumber: { type: String, required: true, unique: true, trim: true },
    holderName: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['auto', 'home', 'life'],
      default: 'auto',
    },
    premium: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled'],
      default: 'active',
    },
    effectiveDate: { type: String, default: '' },
    expirationDate: { type: String, default: '' },
    owner: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Policy || mongoose.model('Policy', policySchema);
