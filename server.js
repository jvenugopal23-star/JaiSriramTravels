const express = require("express");
const mongoose = require("mongoose");
const Booking = require("./models/Booking");
const Review = require("./models/Review")
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,

    auth: {
        user: "jvenugopal23@gmail.com",
        pass: "rlkq spsc mynh qakb"
    },

    tls: {
        rejectUnauthorized: false
    }
});
transporter.verify((error, success) => {
    if (error) {
        console.log("❌ Email connection failed:");
        console.log(error);
    } else {
        console.log("✅ Email server is ready");
    }
});
const PDFDocument = require("pdfkit");

const app = express();

app.set("view engine", "ejs");

// MongoDB Connection
mongoose.connect("mongodb+srv://jvenugopal23_db_user:COnBwSOGvPu7iUDC@cluster0.xvdmnej.mongodb.net/?appName=Cluster0")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ADD THIS LINE
app.use(express.static("public"));

// Home Page
app.get("/", (req, res) => {
    res.render("index");
});
// Get Reviews
app.get("/reviews", async (req, res) => {
    try {
        const reviews = await Review.find().sort({ _id: -1 });
        res.json(reviews);
    } catch (error) {
        console.log(error);
        res.json([]);
    }
});
// Save Review
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
// Admin Login Page
app.get("/login", (req, res) => {
    res.render("login");
});
// Check Admin Login
app.post("/admin/login", (req, res) => {

    const { username, password } = req.body;

    if (
        username === "admin" &&
        password === "admin123"
    ) {
        res.redirect("/admin/bookings");
    } else {
        res.send("❌ Invalid Username or Password");
    }

});

// Save Booking
app.post("/book", async (req, res) => {

    try {
        const booking = new Booking({
            ...req.body,
            status: "Pending"
        });

        await booking.save();

const mailOptions = {
    from: "jvenugopal23@gmail.com",
    to: "jvenugopal23@gmail.com",
    subject: "New Booking - Jai Sriram Travels",

    text: `
New Booking Received

Customer Name: ${booking.name}
Phone: ${booking.phone}
Pickup Location: ${booking.pickup}
Vehicle: ${booking.vehicle}
Destination: ${booking.destination}
Travel Date: ${booking.date}
Status: ${booking.status}
    `
};

await transporter.sendMail(mailOptions);

res.redirect("/admin/bookings");    
    } catch (error) {
        console.log(error);
        res.send("❌ Error Saving Booking");
    }
});

// View All Bookings
app.get("/admin/bookings", async (req, res) => {

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

});

// Confirm Booking
app.get("/confirm/:id", async (req, res) => {

    await Booking.findByIdAndUpdate(
        req.params.id,
        { status: "Confirmed" }
    );

    res.redirect("/admin/bookings");

});

// Delete Booking
app.get("/delete/:id", async (req, res) => {

    await Booking.findByIdAndDelete(req.params.id);

    res.redirect("/admin/bookings");

});
// Download Booking Receipt
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
           .text("JAI SRIRAM TOURS & TRAVELS", { align: "center" });

        doc.moveDown();

        doc.fontSize(14)
           .text("Booking Receipt", { align: "center" });

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

        doc.text("Thank you for choosing Jai Sriram Tours & Travels!");

        doc.end();

    } catch (error) {
        console.log(error);
        res.send("❌ Error generating PDF");
    }
});

// Start Server
app.listen(3000, () => {
    console.log("Server Running on Port 3000");
});