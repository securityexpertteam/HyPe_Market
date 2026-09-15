const mongoose = require('mongoose');
const productSchema = new mongoose.Schema({ name: { type: String, required: true }, description: { type: String, required: true }, category: { type: String, required: true }, price: { type: Number, required: true, min: 0 }, stock: { type: Number, required: true, min: 0 }, imageURL: { type: String, required: true }, images: [String], seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } }, { timestamps: true });
module.exports = mongoose.model('Product', productSchema);
