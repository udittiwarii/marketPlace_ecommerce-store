const { body, validationResult } = require('express-validator');

// middleware to collect errors and respond
async function validateResult(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const stockValidation = body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock must be an integer greater than or equal to 0")


// rule set for product creation/updating
const productValidationRules = [
    body('title')
        .exists({ checkFalsy: true })
        .withMessage('Title is required')
        .isString()
        .withMessage('Title must be a string'),

    body('priceAmount')
        .exists()
        .withMessage('Price amount is required')
        .bail()
        .isNumeric()
        .withMessage('Price amount must be a number'),

    body('priceCurrency')
        .optional()
        .isIn(['USD', 'INR'])
        .withMessage('Currency must be either USD or INR'),

    body('description')
        .optional()
        .isString()
        .withMessage('Description must be a string')
        .trim()
        .isLength({ max: 500 })
        .withMessage("description max length 500 charactor"),

    body('brand')
        .optional()
        .isString()
        .withMessage('Brand must be a string'),

    body('category')
        .optional()
        .isString()
        .withMessage('Category must be a string'),
    stockValidation,
    validateResult
]

const updateProductValidation = [

    // title
    body("title")
        .optional()
        .isString()
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage("Title must be between 2 and 200 characters"),

    // description
    body("description")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage("Description too long"),

    // brand
    body("brand")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Brand must be valid"),

    // category
    body("category")
        .optional()
        .isString()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Category must be valid"),

    // price
    body("priceAmount")
        .optional()
        .isFloat({ gt: 0 })
        .withMessage("Price must be greater than 0"),

    body("priceCurrency")
        .optional()
        .isIn(["USD", "INR"])
        .withMessage("Currency must be USD or INR"),
    stockValidation,
    validateResult

]


module.exports = {
    productValidationRules,
    updateProductValidation
};
