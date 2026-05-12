const express = require('express');
const { connect, subscribeToQueue } = require('./broker/broker')
const setListeners = require('./broker/listner')
//security 


const app = express();

connect().then(() => {
    setListeners();
});

app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).json({ message: 'Notification service is running' });
});

// heath check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'notification' });
});


// error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});





module.exports = app;
