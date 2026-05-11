require("dotenv").config()
const app = require("./src/app")
const connectToDB = require("./src/db/db")


connectToDB()

app.listen(3002, () => {
    console.log("Cart Survice running on port 3002")
})