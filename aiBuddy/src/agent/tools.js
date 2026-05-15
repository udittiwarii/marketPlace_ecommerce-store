const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const axios = require("axios")

const searchProduct = tool(async ({ query, accessToken }) => {
    try {


        const response = await axios.get(`https://marketplace-ecommerce-store.onrender.com/api/products/?q=${query}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })


        return JSON.stringify(response.data);

    } catch (err) {
        console.error("Error searching products:", err);
        return "error fetching products"
    }
}, {
    name: "searchProduct",
    description: "Search for products in the marketplace",
    schema: z.object({
        query: z.string().describe("The search query for the product"),
        // accessToken: z.string().describe("The JWT access token for authentication")
    })
});

const addCart = tool(async ({ productId, quantity, accessToken }) => {
    try {
        const response = await axios.post("https://marketplace-ecommerce-store-cartservice.onrender.com/api/cart/items", {
            productId,
            quantity
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        return JSON.stringify(response.data);
    } catch (err) {
        return "error adding product to cart";
    }
}, {
    name: "addCart",
    description: "Add a product to the shopping cart",
    schema: z.object({
        productId: z.string().describe("The ID of the product to add"),
        quantity: z.number().describe("The quantity of the product to add"),
        // accessToken: z.string().describe("The JWT access token for authentication")
    })
});


module.exports = {
    searchProduct,
    addCart
}