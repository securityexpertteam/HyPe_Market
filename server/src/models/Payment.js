const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['captured', 'failed', 'refunded'], default: 'captured' },
  provider: { type: String, default: 'dummy' },
  transactionId: { type: String, required: true, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
