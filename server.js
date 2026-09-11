require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const Booking = require("./models/Booking");
const Review = require("./models/Review");
const PDFDocument = require("pdfkit");
const { BrevoClient } = require("@getbrevo/brevo");

const app = express();

// -------------------------
// Brevo Email API
// -------------------------
const brevo = new BrevoClient({
    apiKey: process.env.BREVO_API_KEY
});

// -------------------------
// App Settings
// -------------------------
app.set("view engine", "ejs");

// -------------------------
// MongoDB Connection
// -------------------------
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("MongoDB Error:", err));

// -------------------------
// Middleware
// -------------------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// -------------------------
// Home Page
// -------------------------
app.get("/", (req, res) => {
    res.render("index");
});

// -------------------------
// Get Reviews
// -------------------------
app.get("/reviews", async (req, res) => {
    try {
        const reviews = await Review.find().sort({ _id: -1 });
        res.json(reviews);
    } catch (error) {
        console.log(error);
        res.json([]);
    }
});

// -------------------------
// Save Review
// -------------------------
app.post("/reviews", async (req, res) => {
    try {
        const review = new Review({
            name: req.body.name,
            rating: req.body.rating,
            comment: req.body.comment
        });

        await review.save();

        res.redirect("/");
    } catch (error) {
        console.log(error);
        res.send("❌ Error Saving Review");
    }
});

// -------------------------
// Admin Login Page
// -------------------------
app.get("/login", (req, res) => {
    res.render("login");
});

// -------------------------
// Admin Login
// -------------------------
app.post("/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (username === "admin" && password === "admin123") {
        res.redirect("/admin/bookings");
    } else {
        res.send("❌ Invalid Username or Password");
    }
});

// -------------------------
// Save Booking
// -------------------------
app.post("/book", async (req, res) => {
    try {
        const booking = new Booking({
            ...req.body,
            status: "Pending"
        });

        // Save booking to MongoDB
        await booking.save();

        // Send booking email through Brevo API
        try {
            const result = await brevo.transactionalEmails.sendTransacEmail({
                sender: {
                    email: process.env.EMAIL_USER,
                    name: "Jai Sriram Travels"
                },

                to: [
                    {
                        email: process.env.EMAIL_USER
                    }
                ],

                subject: "New Booking - Jai Sriram Travels",

                textContent: `
New Booking Received

Customer Name: ${booking.name}
Phone: ${booking.phone}
Pickup Location: ${booking.pickup}
Vehicle: ${booking.vehicle}
Destination: ${booking.destination}
Travel Date: ${booking.date}
Status: ${booking.status}
                `
            });

            console.log(
                "✅ Booking email sent through Brevo:",
                result.messageId
            );

        } catch (emailError) {
            console.log(
                "⚠️ Booking saved, but email could not be sent:",
                emailError.message
            );
        }

        res.redirect("/admin/bookings");

    } catch (error) {
        console.log(error);
        res.send("❌ Error Saving Booking");
    }
});

// -------------------------
// View All Bookings
// -------------------------
app.get("/admin/bookings", async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ _id: -1 });

        const totalBookings = bookings.length;

        const pendingBookings = bookings.filter(
            b => b.status === "Pending"
        ).length;

        const confirmedBookings = bookings.filter(
            b => b.status === "Confirmed"
        ).length;

        res.render("bookings", {
            bookings,
            totalBookings,
            pendingBookings,
            confirmedBookings,

            pendingPercent:
                totalBookings > 0
                    ? (pendingBookings / totalBookings) * 100
                    : 0,

            confirmedPercent:
                totalBookings > 0
                    ? (confirmedBookings / totalBookings) * 100
                    : 0
        });

    } catch (error) {
        console.log(error);
        res.send("❌ Error Loading Bookings");
    }
});

// -------------------------
// Confirm Booking
// -------------------------
app.get("/confirm/:id", async (req, res) => {
    try {
        await Booking.findByIdAndUpdate(
            req.params.id,
            { status: "Confirmed" }
        );

        res.redirect("/admin/bookings");
    } catch (error) {
        console.log(error);
        res.send("❌ Error Confirming Booking");
    }
});

// -------------------------
// Delete Booking
// -------------------------
app.get("/delete/:id", async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);

        res.redirect("/admin/bookings");
    } catch (error) {
        console.log(error);
        res.send("❌ Error Deleting Booking");
    }
});

// -------------------------
// Download Booking Receipt
// -------------------------
app.get("/receipt/:id", async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.send("Booking not found");
        }

        const doc = new PDFDocument();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=booking-${booking._id}.pdf`
        );

        doc.pipe(res);

        doc.fontSize(22)
            .text("JAI SRIRAM TOURS & TRAVELS", {
                align: "center"
            });

        doc.moveDown();

        doc.fontSize(14)
            .text("Booking Receipt", {
                align: "center"
            });

        doc.moveDown(2);

        doc.fontSize(12)
            .text(`Customer Name: ${booking.name}`)
            .text(`Phone: ${booking.phone}`)
            .text(`Pickup Location: ${booking.pickup}`)
            .text(`Vehicle: ${booking.vehicle}`)
            .text(`Destination: ${booking.destination}`)
            .text(`Travel Date: ${booking.date}`)
            .text(`Booking Status: ${booking.status}`);

        doc.moveDown(2);

        doc.text(
            "Thank you for choosing Jai Sriram Tours & Travels!"
        );

        doc.end();

    } catch (error) {
        console.log(error);
        res.send("❌ Error generating PDF");
    }
});

// -------------------------
// Start Server
// -------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Running on Port ${PORT}`);
});