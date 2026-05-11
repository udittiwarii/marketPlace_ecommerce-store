const { body, validationResult } = require('express-validator');
const validator = require('validator')


const responseWithValidationResults = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

const registerValidationRules = () => [
    body('username')
        .isString()
        .withMessage('Username must be a string')
        .isLength({ min: 3 })
        .withMessage('Username must be at least 3 characters long')
        .notEmpty()
        .withMessage('Username is required'),
    body('email')
        .isEmail()
        .withMessage('Invalid email format'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('fullName.firstName')
        .isString()
        .withMessage('First name must be a string')
        .notEmpty()
        .withMessage('First name is required'),
    body('fullName.lastName')
        .isString()
        .withMessage('Last name must be a string')
        .notEmpty()
        .withMessage('Last name is required'),
    body('role')
        .optional()
        .isIn(['user', 'seller'])
        .withMessage('Role must be either user or seller'),
    responseWithValidationResults

]

const loginvalidatorRules = () => [
    body('email')
        .optional()
        .isEmail()
        .withMessage('Invalid email format'),
    body('username')
        .optional()
        .isString()
        .withMessage('Username must be a string'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    body().custom((value, { req }) => {
        if (!req.body.email && !req.body.username) {
            throw new Error('Either email or username is required');
        }
        return true;
    }),
    responseWithValidationResults
]


const addressValidationRules = () => [
    body('street')
        .trim()
        .notEmpty()
        .withMessage('Street is required'),

    body('city')
        .trim()
        .notEmpty()
        .withMessage('City is required'),

    body('state')
        .trim()
        .notEmpty()
        .withMessage('State is required'),

    body('country')
        .trim()
        .toUpperCase()
        .notEmpty()
        .withMessage('Country is required')
        .isIn(['IN', 'US', 'GB', 'CA'])
        .withMessage('Country not supported'),

    body('zipCode')
        .trim()
        .notEmpty()
        .withMessage('Zip code is required')
        .custom((value, { req }) => {
            const country = req.body.country?.toUpperCase();

            if (!validator.isPostalCode(value, country)) {
                throw new Error(`Invalid postal code for ${country}`);
            }

            return true;
        }),

    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone is required')
        .isMobilePhone('any')
        .withMessage('Invalid phone number'),

    body('isDefault')
        .optional()
        .isBoolean()
        .withMessage('Is default must be a boolean value'),

    responseWithValidationResults
]

module.exports = {
    registerValidationRules,
    loginvalidatorRules,
    addressValidationRules
}