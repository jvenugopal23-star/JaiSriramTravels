const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    name: String,
    phone: String,
    pickup: String,
    vehicle: String,
    destination: String,
    date: String,
    status: String
});

module.exports = mongoose.model("Booking", bookingSchema);