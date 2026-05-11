const express = require("express")
const cookieParser = require("cookie-parser")
const orderRouter = require("./routes/order.route")
const cors = require("cors")


const app = express();
app.use(cors());
app.use(express.json({ limit: process.env.JSON_LIMIT || "100kb" }));
app.use(cookieParser());


// API
app.use('/api/order', orderRouter);


module.exports = app
