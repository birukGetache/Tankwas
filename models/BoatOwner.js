const mongoose = require('mongoose');

const boatOwnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fatherName: { type: String, required: true },
  middleName: { type: String, required: true },
  phone: { type: String, required: true },
  round: { type: Number, default: 0 },  
  size: { type: Number, default: 0 },  
}, { timestamps: true });

module.exports = mongoose.model('BoatOwner', boatOwnerSchema);
