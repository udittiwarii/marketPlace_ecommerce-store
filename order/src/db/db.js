const mongoose = require("mongoose");

const connectDB = async () => {

    try {

        const mongoUri = process.env.MONGODB_URI

        await mongoose.connect(mongoUri)

        console.log("Connected to MongoDB")

    } catch (error) {

        console.error("Error connecting to MongoDB:", error)

        process.exit(1)

    }

}
module.exports = connectDB; 
