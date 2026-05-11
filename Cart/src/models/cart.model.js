const mongoose = require("mongoose")

const productSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    amount: {
        type: Number,
        required: true,
    }
})
const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    items: [productSchema],
    totalAmount: {
        type: Number
    },
    totalItems: {
        type: Number
    }

}, { timestamps: true })


const cartModel = mongoose.model("cart", cartSchema)

module.exports = cartModel