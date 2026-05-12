require("dotenv").config()
const app = require("./src/app")
const connectToDB = require("./src/db/db")

const port = process.env.PORT || 3002

connectToDB()

app.listen(port, () => {
    console.log(`Cart Survice running on port ${port}`)
})
