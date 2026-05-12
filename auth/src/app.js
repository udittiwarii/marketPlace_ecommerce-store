const express = require("express")
const cookieParser = require("cookie-parser")
const authRouter = require("./routes/auth")
const cors = require("cors")

const app = express()
app.use(cors())
app.use(express.json())
app.use(cookieParser())

app.get("/", (req, res) => {
    res.status(200).json({ message: "Auth service is running" })
})

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "auth" })
})

app.use('/api/auth', authRouter)

module.exports = app
