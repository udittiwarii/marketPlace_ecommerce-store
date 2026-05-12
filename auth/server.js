require('dotenv').config()
const app = require("./src/app")
const { connectDB } = require("./src/db/db")
const { connect } = require("./src/broker/broker")

const port = process.env.PORT || 3000


connectDB()
connect()


app.listen(port, () => {
    console.log(`Auth service is running on port ${port}`)
})