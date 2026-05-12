const mongoose = require("mongoose")

const connectDB = async () => {
    // Skip database connection during tests
    if (process.env.NODE_ENV === 'test') {
        return
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("MongoDB connected")
    }
    catch (error) {
        console.error("MongoDB connection failed:", error)
        process.exit(1) // Exit the process with failure
    }
}


module.exports = connectDB
