const { subscribeToQueue } = require('./broker')

// models 
const userModel = require('../models/user.model')
const orderModel = require('../models/order.model')
const productModel = require('../models/product.model')
const paymentModel = require('../models/payment.model')


module.exports = function () {

    subscribeToQueue('SELLER_DESHBOARD.new_seller', async (data) => {
        try {
            await userModel.findByIdAndUpdate(data._id, data, {
                new: true,
                upsert: true,
                runValidators: true
            })
        }
        catch (error) {
            console.error("Error syncing dashboard user:", error);
        }
    });

    subscribeToQueue('SELLER_DESHBOARD.new_payment', async (data) => {
        try {
            await paymentModel.findByIdAndUpdate(data._id, data, {
                new: true,
                upsert: true,
                runValidators: true
            })
        }
        catch (error) {
            console.error("Error creating new payment:", error);
        }
    });

    subscribeToQueue('SELLER_DESHBOARD.payment_completed', async (data) => {
        try {
            const payment = await paymentModel.findByIdAndUpdate(data._id, {
                status: "COMPLETED",
                paymentId: data.paymentId,
                signature: data.signature
            }, {
                new: true,
                runValidators: true
            })

            const orderId = data.orderId || payment?.orderId;

            if (!orderId) {
                console.error("Payment completed event missing orderId:", data);
                return;
            }

            await orderModel.findByIdAndUpdate(orderId, {
                paymentStatus: "SUCCESS",
                paymentId: data.paymentId || payment?.paymentId,
                paidAt: new Date(),
                "paymentSummary.transactionId": data.paymentId || payment?.paymentId,
                "paymentSummary.method": payment?.paymentMethod === "COD" ? "COD" : "ONLINE"
            }, {
                runValidators: true
            })
        }
        catch (error) {
            console.error("Error updating payment status:", error);
        }
    });

    subscribeToQueue('SELLER-DASHBOARD.PRODUCT_CREATED', async (data) => {
        try {
            productModel.create(data)
        }
        catch (error) {
            console.error("Error creating new product:", error);
        }
    });

    subscribeToQueue('SELLER-DASHBOARD.PRODUCT_UPDATED', async (data) => {
        try {
            productModel.findByIdAndUpdate(data._id, data)

        } catch (error) {
            console.error("Error updating product:", error);
        }
    })

    subscribeToQueue('SELLER-DASHBOARD.PRODUCT_DELETED', async (data) => {
        try {
            productModel.findByIdAndDelete(data._id)
        } catch (error) {
            console.error("Error deleting product:", error);
        }
    })

    subscribeToQueue('SELLER-DASHBOARD.INVENTORY_DEDUCTED', async (items) => {
        try {
            const bulkOps = items.map(item => ({
                updateOne: {
                    filter: {
                        _id: item.productId,
                        reserved: { $gte: item.quantity }
                    },
                    update: {
                        $inc: {
                            stock: -item.quantity,
                            reserved: -item.quantity
                        }
                    }
                }
            }));
            await productModel.bulkWrite(bulkOps);
        } catch (error) {
            console.error("Error deducting inventory:", error);
        }
    });

    subscribeToQueue(
        "SELLER-DASHBOARD.NEW_ORDER",
        async (data) => {
            try {
                orderModel.create(data)
            } catch (error) {
                console.error(
                    "Error creating new order:",
                    error
                );
            }
        }
    );

};
