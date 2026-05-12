require('dotenv').config();
const app = require('./src/app')
const connectDB = require('./src/db/db')
const { connect } = require('./src/broker/broker')
const startListener = require('./src/broker/listner')



const port = process.env.PORT || 3008;

const serverStart = async () => {
    try {
         connectDB();
        connect().then(() => {
            startListener()
        })
        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    } catch (error) {
        console.error('Error starting the server:', error);
    }
}

serverStart();