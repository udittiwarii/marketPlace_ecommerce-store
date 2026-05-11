const { body, param, validationResult } = require("express-validator")
const mongoose = require("mongoose")

function validateResult(req, res, next) {
    const errors = validationResult(req)

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        })
    }

    next()
}

const validateAddItemToCart = [
    body('productId')
        .notEmpty()
        .withMessage("Product ID is required")
        .bail()
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid product ID format"),

    body('quantity')
        .isInt({ gt: 0 })
        .withMessage("Quantity must be a positive integer"),

    validateResult
]

const validationUpdateCart = [
    param('productId')
        .notEmpty()
        .withMessage("Product ID is required")
        .bail()
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid product ID format"),


    body('quantity')
        .isInt()
        .withMessage("Quantity must be an integer"),


    validateResult
]

const validateDeleteCartItem = [
    param('productId')
        .notEmpty()
        .withMessage("Product ID is required")
        .bail()
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Invalid product ID format"),

    validateResult
]

module.exports = {
    validateAddItemToCart,
    validationUpdateCart,
    validateDeleteCartItem
}