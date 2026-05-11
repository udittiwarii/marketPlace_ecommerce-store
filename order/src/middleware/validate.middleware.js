const { validationResult, param, body } = require("express-validator")
const mongoose = require("mongoose")

function isValidAddressPhone(phone, country) {
    const normalizedPhone = String(phone).trim();
    const normalizedCountry = String(country).trim().toUpperCase();

    if (normalizedCountry === "IN") {
        return /^(?:\+91)?\d{10}$/.test(normalizedPhone);
    }

    return /^\+?\d{7,15}$/.test(normalizedPhone);
}

function validateResultMiddleware(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    next();
}

function validateGetOrderById() {
    return [
        param("orderId")
            .notEmpty()
            .withMessage("Order ID is required")
            .bail()
            .custom(value => mongoose.Types.ObjectId.isValid(value))
            .withMessage("Invalid order ID format"),

        validateResultMiddleware
    ]


};

function validateBuynow() {
    return [
        body('productId')
            .notEmpty()
            .withMessage("Product ID is required")
            .bail()
            .custom(value => mongoose.Types.ObjectId.isValid(value))
            .withMessage("Invalid product ID format"),

        body('quantity')
            .isInt({ gt: 0 })
            .withMessage("Quantity must be a positive integer"),

        validateResultMiddleware
    ]

}

function validateCancelOrder() {
    return [
        param("id")
            .notEmpty()
            .withMessage("Order ID is required")
            .bail()
            .custom(value => mongoose.Types.ObjectId.isValid(value))
            .withMessage("Invalid order ID format"),
        validateResultMiddleware
    ]
}

function validateUpdateOrderAddress() {
    return [
        param("id")
            .notEmpty()
            .withMessage("Order ID is required")
            .bail()
            .custom(value => mongoose.Types.ObjectId.isValid(value))
            .withMessage("Invalid order ID format"),
        body('shippingAddress')
            .exists()
            .withMessage('Shipping address is required')
            .bail()
            .isObject()
            .withMessage('Shipping address must be an object')
            .bail()
            .custom((value) => {
                const address = value.address && typeof value.address === "object"
                    ? value.address
                    : value;
                const requiredFields = ["street", "city", "state", "country", "zipCode", "phone"];

                for (const field of requiredFields) {
                    if (!address[field] || String(address[field]).trim() === "") {
                        throw new Error(`${field} is required`);
                    }
                }

                if (!["IN", "US", "GB", "CA"].includes(String(address.country).toUpperCase())) {
                    throw new Error("Country not supported");
                }

                if (!isValidAddressPhone(address.phone, address.country)) {
                    throw new Error("Invalid phone number");
                }
                if (String(address.state).length < 2 || String(address.state).length > 50) {
                    throw new Error("Invalid state length");
                }
                if (String(address.city).length < 2 || String(address.city).length > 50) {
                    throw new Error("Invalid city length");
                }
                if (String(address.zipCode).length < 3 || String(address.zipCode).length > 10) {
                    throw new Error("Invalid zip code length");
                }

                return true;
            }),

        validateResultMiddleware
    ]
}


module.exports = {
    validateGetOrderById,
    validateBuynow,
    validateCancelOrder,
    validateUpdateOrderAddress
}
