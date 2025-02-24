const mongoose = require('mongoose');

const promocodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // Unique promocode
  discount: { type: Number, required: true }, // Discount percentage or amount
  expiryDate: { type: Date, required: true }, // Expiration date for promocode
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const Promocode = mongoose.model('Promocode', promocodeSchema);
module.exports = Promocode;
