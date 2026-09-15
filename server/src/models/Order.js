const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    price: Number,
    quantity: Number,
    imageURL: String,
  }],
  total: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'delivered', 'cancelled'], default: 'pending' },
  delivery: { address: String, contact: String, eta: String },
}, { timestamps: true });
module.exports = mongoose.model('Order', orderSchema);
