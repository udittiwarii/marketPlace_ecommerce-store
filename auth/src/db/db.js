const mongoose = require("mongoose")

let isConnected = false

const connectDB = async (uri) => {
    try {
        const mongoUri = uri || process.env.MONGODB_URI
        await mongoose.connect(mongoUri)
        isConnected = true
    } catch (error) {
        console.error("Error connecting to MongoDB:", error)
        process.exit(1)
    }
}

const closeDB = async () => {
    try {
        if (isConnected) {
            await mongoose.connection.dropDatabase()
            await mongoose.connection.close()
            isConnected = false
        }
    } catch (error) {
        console.error('Error closing MongoDB connection:', error)
    }
}

module.exports = { connectDB, closeDB }
