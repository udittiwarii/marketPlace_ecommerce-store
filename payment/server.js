require('dotenv').config();

const app = require('./src/app');

const connectDB = require('./src/db/db');
const { connect } = require('./src/broker/broker');

const port = process.env.PORT || 3004;

connectDB();
connect();


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
