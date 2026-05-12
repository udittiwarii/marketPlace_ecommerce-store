require("dotenv").config();
const app = require("./src/app");
const connectToDB = require("./src/db/db")
const { connect } = require("./src/broker/broker")

const port = process.env.PORT || 3003;

const startServer = async () => {
    await connectToDB();
    await connect();
    const server = app.listen(port, () => {
        console.log(`Order service is running on port ${port}`)
    })
}

startServer();