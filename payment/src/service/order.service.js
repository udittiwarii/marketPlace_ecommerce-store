const axios = require('axios');


const orderServiceUrl = process.env.order_service_url || "http://localhost:3003/api/order";

const getOrderByID = async function (orderId, accessToken) {
    try {
        const response = await axios.get(`${orderServiceUrl}/${orderId}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        return response.data;

    } catch (err) {
        console.error("Error creating order:", err);
        throw err;

    }
};

const markOrderPaid = async function (orderId, serviceToken) {
    try {
        const response = await axios.post(`${orderServiceUrl}/${orderId}/marked-paid`, {}, {
            headers: {
                'x-service-token': ` ${process.env.INTERNAL_SERVICE_TOKEN}`
            }
        });
    } catch (err) {
        console.error("Error marking order as paid:", err);
        throw err;
    }
};


module.exports = {
    getOrderByID,
    markOrderPaid
};