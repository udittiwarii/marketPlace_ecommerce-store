const axios = require("axios");
const cartURL = process.env.cart_service_url || "http://localhost:3002/api/cart/"

function createServiceError(message, err) {
    const error = new Error(message);
    error.statusCode = err.response?.status || 500;
    error.details = err.response?.data;
    return error;
}

async function getUserCart(accessToken) {
    try {
        const cartResponse = await axios.get(`${cartURL}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
        const cart = cartResponse.data.cart


        return cart;


    } catch (err) {
        console.error(err)
        throw createServiceError("Failed to fetch cart", err);
    }
}

async function clearCart(accessToken) {
    try {

        await axios.delete(`${cartURL}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })

    } catch (err) {
        throw createServiceError("Failed to clear cart", err);
    }
}


module.exports = {
    getUserCart,
    clearCart
}
