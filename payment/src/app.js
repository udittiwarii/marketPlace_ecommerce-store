const express = require('express');
const cors = require('cors');

// router api
const paymentRoutes = require('./routes/payment.route');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
    res.status(200).json({ message: "Payment service is running" });
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "payment" });
});

app.use("/api/payments", paymentRoutes);

module.exports = app;
