const express = require("express")
const orderController = require("./../controller/order.controller")
const authMiddleware = require("./../middleware/auth.middleware")
const validationMiddleware = require("./../middleware/validate.middleware")

const router = express.Router();

// placeholder implementation; real controller logic is pending
router.post('/from-cart', authMiddleware.createAuthMiddleware(["user"]), orderController.createOrderBYFromCart);

router.post('/buy-now', authMiddleware.createAuthMiddleware(["user"]), validationMiddleware.validateBuynow(), orderController.createOrderBuyNow);

router.post("/:id/cancel", authMiddleware.createAuthMiddleware(["user"]), validationMiddleware.validateCancelOrder(), orderController.cancelOrder);

router.patch("/:id/address", authMiddleware.createAuthMiddleware(["user"]), validationMiddleware.validateUpdateOrderAddress(), orderController.updateOrderAddress);

router.post("/:id/marked-paid", authMiddleware.serviceAuthMiddleware, orderController.markOrderAsPaid);

router.get('/me', authMiddleware.createAuthMiddleware(["user", "admin"]), orderController.getMyOrders);


router.get('/:orderId', authMiddleware.createAuthMiddleware(["user", "admin"]), validationMiddleware.validateGetOrderById(), orderController.getOrderById);




module.exports = router;




