const express = require("express")
const cookieParser = require("cookie-parser")
const authRouter = require("./routes/auth")
const cors = require("cors")

const app = express()
app.use(cors({
    origin: process.env.REACT_APP_URL, // React app URL
    credentials: true, // Allow cookies to be sent
}))
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRouter)

module.exports = app