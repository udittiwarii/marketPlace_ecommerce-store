const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String,
    isDefault: {
        type: Boolean,
        default: true
    }
})


const itemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    quantity: {
        type: Number,
        default: 1,
        min: 1
    },
    price: {
        amount: {
            type: Number,
            required: "true"

        },
        currency: {
            type: String,
            required: true,
            enum: ["USD", "INR"]
        }
    },
    total: {
        type: Number,
        required: true,
        min: 0
    }
})

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    items: [itemSchema],
    status: {
        type: String,
        enum: ["CANCELLED", "CONFIRMED", "PENDING", "SHIPPED", "OUTOFDELEVERY", "DELIVERED"],
        default: "PENDING"
    },
    paymentStatus: {
        type: String,
        enum: ["PENDING", "SUCCESS", "FAILED"],
        default: "PENDING"
    },
    paymentSummary: {
        method: {
            type: String,
            enum: ["COD", "ONLINE"]
        },
        transactionId: String,
    },
    paymentId: String,
    paymentProvider: String,
    paidAt: Date,
    statusHistory: [
        {
            status: String,
            updatedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    totalPrice: {
        subtotal: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            required: true,
            enum: ["USD", "INR"]
        },
        tax: {
            type: Number
        },
        shipping: {
            type: Number
        },
        total: {
            type: Number,
            required: true
        }
    },
    shippingAddress: addressSchema


}, { timestamps: true })


const orderModel = mongoose.model("order", orderSchema);

module.exports = orderModel;