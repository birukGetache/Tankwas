const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
    title: String,
    description: String,
    image: String
});

module.exports = mongoose.model('Destination', destinationSchema);
