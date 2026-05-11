require("dotenv").config();
const app = require("./src/app");
const connectToDB = require("./src/db/db")



connectToDB();

const server = app.listen(3003, () => {
    console.log("Order service is running on port 3003")
})