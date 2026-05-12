require('dotenv').config()
const app = require('./src/app')
const { connect } = require('./src/broker/broker')


const connectDB = require('./src/db/db')

const requiredEnv = ["MONGODB_URI", "JWT_SECRET"]
const missingEnv = requiredEnv.filter((key) => !process.env[key])
if (missingEnv.length > 0) {
  console.warn(`Missing environment variables: ${missingEnv.join(", ")}`)
}


const port = process.env.PORT || 3001

startServer = async () => {
  await connectDB();
  await connect();
  const server = app.listen(port, () => {
    console.log(`product service is running on port ${port}`)
  })
}

startServer()