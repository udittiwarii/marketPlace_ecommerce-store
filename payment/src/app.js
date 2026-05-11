const express = require('express');
const cors = require('cors');

// router api
const paymentRoutes = require('./routes/payment.route');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cors({
    origin: process.env.REACT_APP_URL, // React app URL
    credentials: true, // Allow cookies to be sent
}));
app.use(express.json());
app.use(cookieParser());


app.use("/api/payments", paymentRoutes);

module.exports = app;