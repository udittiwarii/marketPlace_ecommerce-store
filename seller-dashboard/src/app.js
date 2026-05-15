const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const cookieParser = require('cookie-parser')
const sellerDashboardRoutes = require("./routes/sellerdashboard.route");

const app = express();


// ================= SECURITY =================

// Secure HTTP headers
app.use(helmet());

// Prevent Mongo injection

// Enable CORS
app.use(cors());

// cookieparser 

app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: "Too many requests from this IP"
});

app.use(limiter);


// ================= PERFORMANCE =================

// Compress responses
app.use(compression());


// ================= BODY PARSER =================

app.use(express.json({
    limit: "10kb"
}));

app.use(express.urlencoded({
    extended: true
}));


// ================= ROUTES =================

app.use(
    "/api/seller/dashboard",
    sellerDashboardRoutes
);

app.get("/", (req, res) => {
    res.send("Seller Dashboard Service is running 🚀");
});


// ================= ERROR HANDLER =================

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "seller-dashboard" });
});

app.use((err, req, res, next) => {

    console.error(err.stack);

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });

});


module.exports = app;
