const mongoose = require('mongoose');

const sponsorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String, required: true },
  url: { type: String, required: true },
  description: { type: String },
  twitter: { type: String },
  facebook: { type: String },
  instagram: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Sponsor', sponsorSchema);
