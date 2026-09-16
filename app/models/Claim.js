const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    author: { type: String, default: '' },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const claimSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    claimNumber: { type: String, required: true, unique: true, trim: true },
    policy: { type: String, required: true, trim: true },
    incidentDate: { type: String, required: true, trim: true },
    amount: { type: Number, default: 0 },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['submitted', 'under-review', 'approved', 'denied', 'closed'],
      default: 'submitted',
    },
    assignedTo: { type: String, default: '' },
    notes: [noteSchema],
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

module.exports = mongoose.models.Claim || mongoose.model('Claim', claimSchema);
