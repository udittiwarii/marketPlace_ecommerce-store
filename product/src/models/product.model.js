const mongoose = require("mongoose")

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
    },
    brand: {
        type: String,
    },
    price: {
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            enum: ['USD', 'INR'],
            default: 'INR'
        }
    },
    category: {
        type: String,
    },
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        index: true
    },
    reserved: {
        type: Number,
        default: 0,
        min: 0
    },
    reservedUntil: {
        type: Date
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    images: [{
        url: String,
        thumbnailUrl: String,
        fileId: String
    }]
}, { timestamps: true })

productSchema.index({ title: 'text', description: 'text', category: 'text', brand: 'text' })

const productModel = mongoose.model('product', productSchema)

module.exports = productModel
