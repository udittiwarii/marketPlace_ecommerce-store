const express = require('express')
const validator = require("../middleware/validator.middleware")
const authController = require("../controllers/Auth.controller")
const authMiddleware = require("../middleware/auth.middleware")

const router = express.Router()

// /api/auth/refresh refresh token route
router.post('/refresh', authController.refreshToken)

// /api/auth/register register routes
router.post('/register', validator.registerValidationRules(), authController.registerUser)

// /api/auth/login login routes
router.post('/login', validator.loginvalidatorRules(), authController.loginUser)

// /api/auth/me fetch data route
router.get('/me', authMiddleware.authMiddleware, authController.getUserController)

// /api/auth/logout logout route
router.get('/logout', authController.logoutUser)

// /api/auth/users/me/addresses get addresses route
router.get('/users/me/addresses', authMiddleware.authMiddleware, authController.getAddressesController)

// post /api/auth/users/me/addresses add address route
router.post('/users/me/addresses', authMiddleware.authMiddleware, validator.addressValidationRules(), authController.addAddressController)

// delete /api/auth/users/me/addresses/:addressId delete address route
router.delete('/users/me/addresses/:addressId', authMiddleware.authMiddleware, authController.deleteAddressController)

module.exports = router