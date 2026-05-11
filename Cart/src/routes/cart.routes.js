const express = require("express")
const createAuthMiddleware = require("./../middleware/auth.middleware")
const cartController = require("./../controllers/cart.controllers")
const validation = require("../middleware/validation.middleware")
const productIdMiddleware = require("./../middleware/product.middleware")

const router = express.Router()

router.post("/items", createAuthMiddleware(["user"]), validation.validateAddItemToCart, productIdMiddleware, cartController.addItemToCart);

router.patch("/items/:productId", createAuthMiddleware(["user"]), validation.validationUpdateCart, productIdMiddleware, cartController.updateItemToCart);
router.get("/", createAuthMiddleware(["user"]), cartController.getCart);


// delete cart item
router.delete("/items/:productId", createAuthMiddleware(["user"]), validation.validateDeleteCartItem, cartController.removeItemFromCart);

// delete cart
router.delete("/", createAuthMiddleware(["user"]), cartController.clearCart);



module.exports = router
