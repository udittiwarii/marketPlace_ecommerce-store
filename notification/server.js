require('dotenv').config();
const app = require('./src/app')


const PORT = process.env.PORT || 3006;

const startServer = async () => {
    await app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

 startServer();
