const amqplib = require('amqplib');

let channel, connection;

async function connect() {
    if (connection) return connection;
    try {
        connection = await amqplib.connect(process.env.RABIT_URL);
        connection.on("error", (err) => {
            console.log("RabbitMQ error:", err.message);
        });

        connection.on("close", () => {
            console.log("RabbitMQ disconnected. Reconnecting...");
            setTimeout(connect, 5000);
        });
        console.log("RabbitMQ connected");
        channel = await connection.createChannel();
    } catch (error) {
        console.error('Error connecting to RabbitMQ:', error);
        throw error;
    }
};

async function publish(queue, data = {}) {
    if (!channel || !connection) {
        await connect();
    }

    try {
        await channel.assertQueue(queue, { durable: true });

        channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true });
    } catch (error) {
        console.error('Error publishing message:', error);
        throw error;
    }
}

async function subscribeToQueue(queueName, callback) {
    if (!channel || !connection) {
        await connect();
    }

    try {
        await channel.assertQueue(queueName, { durable: true });
        channel.consume(queueName, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                await callback(data);
                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error('Error subscribing to queue:', error);
        throw error;
    }
}

module.exports = {
    connect,
    channel,
    connection,
    publish,
    subscribeToQueue,
};
