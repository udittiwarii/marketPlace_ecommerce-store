const paymentModel = require('./../models/payment.model');
const orderService = require('./../service/order.service')
const razorpayInstance = require('./../config/razorpay.config');
const { validatePaymentVerification } = require('./../../node_modules/razorpay/dist/utils/razorpay-utils.js')
const { publish } = require('./../broker/broker');

// const { default: axios } = require('axios');

function readAccessToken(req) {
    if (req.cookies?.accessToken) {
        return req.cookies.accessToken;
    }

    const authHeader = req.headers.authorization || "";
    if (authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }

    return null;
}

async function createPayment(req, res) {
    const accessToken = readAccessToken(req);
    if (!accessToken) {
        return res.status(401).json({ message: "Unauthorized " })
    }
    try {
        const orderId = req.params.orderId;
        const userId = req.user.id;

        const orderData = await orderService.getOrderByID(orderId, accessToken);

        if (!orderData) {
            return res.status(404).json({
                message: "Order not found"
            })
        }

        if (orderData.status !== "PENDING") {
            return res.status(400).json({
                message: "Payment can only be initiated for orders in PENDING status"
            })
        }

        if (orderData.userId !== userId) {
            return res.status(403).json({
                message: "You are not authorized to make payment for this order"
            })
        }

        const paymentRecord = await razorpayInstance.orders.create({
            amount: orderData.totalPrice.total * 100,
            currency: orderData.totalPrice.currency,
            receipt: `receipt_${orderId}`,
            payment_capture: 1
        })

        const newPayment = new paymentModel({
            orderId: orderId,
            razorpayOrderId: paymentRecord.id,
            userId: userId,
            user: {
                email: req.user.email || '',
                username: req.user?.username || ''
            },
            price: {
                amount: orderData.totalPrice.total,
                currency: orderData.totalPrice.currency
            }, paymentMethod: "RAZORPAY",
            attempts: paymentRecord.attempts || 1,

        })

        await newPayment.save();

        return res.status(201).json({
            message: "Payment initiated successfully",
            paymentId: newPayment._id,
            razorpayOrderId: paymentRecord.id,
            amount: paymentRecord.amount,
            currency: paymentRecord.currency
        })

    } catch (err) {
        console.error("Error creating payment:", err);
        res.status(500).json({
            message: "Internal server error"
        })
    }
}

async function verifypayment(req, res) {

    const serviceToken = process.env.SERVICE_TOKEN;
    let email = "";
    let username = "";

    try {

        const { razorpayOrderId, paymentId, signature } = req.body;


        if (!razorpayOrderId || !paymentId || !signature) {
            return res.status(400).json({
                message: "Missing required fields"
            })
        }

        const paymentRecord = await paymentModel.findOne({ razorpayOrderId: razorpayOrderId });

        email = paymentRecord?.user?.email;
        username = paymentRecord?.user?.username || "";

        if (!paymentRecord) {
            return res.status(404).json({
                message: "Payment record not found"
            })
        }

        if (paymentRecord.status !== "PENDING") {
            return res.status(400).json({
                message: "Payment is not in a valid state for verification"
            })
        }


        const isValid = validatePaymentVerification(
            {
                order_id: razorpayOrderId,
                payment_id: paymentId
            },
            signature,
            process.env.RAZORPAY_KEY_SECRET
        )


        if (isValid) {
            paymentRecord.paymentId = paymentId;
            paymentRecord.signature = signature;
            paymentRecord.status = "COMPLETED";
            await paymentRecord.save();
            await orderService.markOrderPaid(paymentRecord.orderId, serviceToken);

            // Publish payment completion event to RabbitMQ
            await publish('PAYMENT_NOTIFICATION.PAYMENT_COMPLETION', {
                paymentId: paymentRecord._id,
                orderId: paymentRecord.orderId,
                amount: paymentRecord.price.amount,
                currency: paymentRecord.price.currency,
                userId: paymentRecord.userId,
                email: email,
                username: username
            });

            return res.status(200).json({
                message: "Payment verified and order marked as paid"
            })
        } else {
            paymentRecord.status = "FAILED";
            await paymentRecord.save();
            await publish('PAYMENT_NOTIFICATION.PAYMENT_FAILURE', {
                paymentId: paymentRecord._id,
                orderId: paymentRecord.orderId,
                userId: paymentRecord.userId,
                email: email,
                username: username,
                amount: paymentRecord.price.amount,
                currency: paymentRecord.price.currency

            });
            return res.status(400).json({
                message: "Payment verification failed"
            })
        }

    } catch (err) {
        console.error("Error verifying payment:", err);
        await publish('PAYMENT_NOTIFICATION.PAYMENT_FAILURE', {
            email: email,
            username: username,
            error: err.message
        });
        res.status(500).json({
            message: "Internal server error"
        })
    }


}

module.exports = {
    createPayment,
    verifypayment
}