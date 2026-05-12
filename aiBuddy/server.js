require('dotenv').config();
const app = require('./src/app');
const http = require('http');


const { initSocketServer } = require('./src/socket/socket.server');

const httpServer = http.createServer(app)

initSocketServer(httpServer);

const port = process.env.PORT || 3005;

httpServer.listen(port, () => {
    console.log(`server is running on port ${port}`)
});
