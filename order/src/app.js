const express = require("express")
const cookieParser = require("cookie-parser")
const orderRouter = require("./routes/order.route")
const cors = require("cors")


const app = express();
app.use(cors());
app.use(express.json({ limit: process.env.JSON_LIMIT || "100kb" }));
app.use(cookieParser());


// API
app.get("/", (req, res) => {
    res.status(200).json({ message: "Order service is running" });
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "order" });
});

app.use('/api/order', orderRouter);


module.exports = app
