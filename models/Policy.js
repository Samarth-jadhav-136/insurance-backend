const mongoose = require('mongoose');

const ProcedureSchema = new mongoose.Schema({
  name: String,
  waitingPeriod: String
}, { _id: false });

const PolicySchema = new mongoose.Schema({
  userId: { type: String, required: true },

  // Full readable version (for chat / RAG)
  policyMarkdown: { type: String, required: true },

  // Basic info
  insurerName: String,
  policyName: String,

  // Financials
  totalLimit: [Number],       // multiple plans possible
  deductible: [Number],
  roomRentLimit: String,

  // Core logic fields
  procedures: [ProcedureSchema],
  documents: [String],

  uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Policy', PolicySchema);