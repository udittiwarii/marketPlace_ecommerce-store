require('dotenv').config()
const app = require('./src/app')

const connectDB = require('./src/db/db')

const requiredEnv = ["MONGODB_URI", "JWT_SECRET"]
const missingEnv = requiredEnv.filter((key) => !process.env[key])
if (missingEnv.length > 0) {
  console.warn(`Missing environment variables: ${missingEnv.join(", ")}`)
}

connectDB()

app.listen(3001, () => {
  console.log('product service is running on port 3001')
})
