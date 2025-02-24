const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: { type: String, required: false }, // Optional
  lastName: { type: String, required: true },
  amount: { type: Number, required: true },
  email: { type: String, required: true },
  preferredDate: { type: Date, required: true },
  departureLocation: { type: String, required: true },
  phone: { type: String, required: true },
  destinationLocation: { type: String, required: true },
  numberOfPassengers: { type: Number, required: true },
  typeOfTransport: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  currency: { type: String, required: true },
  boatOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'BoatOwner', required: true }, // Adding reference to BoatOwner model
  varified:{ type: Boolean, default: false },
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;
