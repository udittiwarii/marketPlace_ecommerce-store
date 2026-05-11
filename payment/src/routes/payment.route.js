const express = require('express');
const createAuthMiddleware = require('./../middleware/auth.middleware');
const paymentController = require('./../controllers/payment.controller');


const router = express.Router();

router.post('/verify/payment', paymentController.verifypayment);


router.post('/:orderId', createAuthMiddleware(["user"]), paymentController.createPayment);




module.exports = router;


/*
================ PAYMENT SERVICE FLOW =================

1. createPayment:
   - User initiates payment
   - Razorpay order create hota hai
   - Payment record DB me save hota hai (status = PENDING)

2. verifyPayment:
   - Razorpay signature verify hota hai
   - Payment SUCCESS → orderService.markOrderPaid()
   - Inventory deduct hoti hai

3. FAILED FLOW:
   - payment.failed webhook OR invalid signature
   - Payment status → FAILED
   - orderService.markOrderFailed()
   - Inventory release hoti hai

4. REFUND FLOW:
   - User cancels order (after payment)
   - Refund API call Razorpay pe
   - Payment status → REFUNDED
   - Order status update

======================================================
*/