const express = require("express")
const cookieParser = require("cookie-parser")
const multer = require("multer")
const productRoutes = require("./routes/product.routes")
const cors = require("cors")



const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: process.env.REACT_APP_URL, // React app URL
    credentials: true, // Allow cookies to be sent
}))

app.get("/", (req, res) => {
    res.status(200).json({ message: "Product service is running" })
})

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "product" })
})

app.use("/api/products", productRoutes)

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.message })
    }

    if (err) {
        console.error("Unhandled request error", { message: err.message })
        return res.status(400).json({ message: err.message || "Request failed" })
    }

    next()
})

module.exports = app
