const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    paymentId: {
        type: String,
    },
    razorpayOrderId: {
        type: String,
        required: true
    },
    signature: {
        type: String,
    }, status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
        default: 'PENDING'
    },
    paymentMethod: {
        type: String,
        enum: ['RAZORPAY', 'COD'],
        default: 'RAZORPAY'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    user: {
        email: {
            type: String,
        },
        username: {
            type: String
        }
    },
    price: {
        amount: {
            type: Number,
            required: true
        }, currency: {
            type: String,
            required: true,
            default: 'INR',
            enum: ['INR', "USD"]
        }
    }, atempt: {
        type: Number,
        default: 1
    }

}, { timestamps: true })

const paymentModel = mongoose.model("Payment", paymentSchema);

module.exports = paymentModel;