const express = require('express');
const cors = require('cors');

// router api
const paymentRoutes = require('./routes/payment.route');
const cookieParser = require('cookie-parser');

const app = express();
app.use(cors({
  
}));
app.use(express.json());
app.use(cookieParser());


app.use("/api/payments", paymentRoutes);

module.exports = app;