const mongoose = require("mongoose");
const userModel = require("./../models/user.model");
const orderModel = require("./../models/order.model");
const productModel = require("./../models/product.model");
const paymentModel = require("./../models/payment.model");

const formatUserName = (user) => {
    if (!user) return null;

    const firstName = user.fullName?.firstName || "";
    const lastName = user.fullName?.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();

    return fullName || user.username || null;
};

const formatUser = (user) => ({
    name: formatUserName(user),
    email: user?.email || null
});

const formatCustomer = (user, payment) => ({
    name: formatUserName(user) || payment?.user?.username || "Unknown customer",
    email: user?.email || payment?.user?.email || "Not available"
});

const formatSeller = (seller) => ({
    name: formatUserName(seller) || "Unknown seller",
    email: seller?.email || "Not available"
});

const getDocumentId = (value) => value?._id || value;

const parseLimit = (value) => {
    const parsedLimit = Number.parseInt(value, 10);

    if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        return 10;
    }

    return Math.min(parsedLimit, 50);
};

const formatMoney = (price = {}) => ({
    amount: price.amount ?? 0,
    currency: price.currency || null
});

const getPaymentMethod = (order, payment) => (
    order.paymentSummary?.method ||
    payment?.paymentMethod ||
    null
);

const isSuccessfulPayment = (order, payment) => {
    const statuses = [
        order.paymentStatus,
        payment?.status
    ].filter(Boolean).map(status => String(status).toUpperCase());

    return statuses.some(status => ["SUCCESS", "COMPLETED"].includes(status));
};

const recentOrders = async (req, res) => {
    try {
        const sellerId = req.user?.id;

        if (!mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid seller ID"
            });
        }

        const limit = parseLimit(req.query.limit);

        const orders = await orderModel
            .find({ "items.seller": sellerId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate({
                path: "user",
                model: userModel,
                select: "username email fullName"
            })
            .populate({
                path: "items.product",
                model: productModel,
                select: "title price images"
            })
            .populate({
                path: "items.seller",
                model: userModel,
                select: "username email fullName"
            })
            .lean();

        const orderIds = orders.map(order => order._id);

        const payments = await paymentModel
            .find({ orderId: { $in: orderIds } })
            .sort({ createdAt: -1 })
            .lean();

        const paymentByOrderId = new Map();
        payments.forEach(payment => {
            const orderId = String(payment.orderId);

            if (!paymentByOrderId.has(orderId)) {
                paymentByOrderId.set(orderId, payment);
            }
        });

        const recentOrders = orders.map(order => {
            const sellerItems = order.items.filter(item => (
                String(getDocumentId(item.seller)) === String(sellerId)
            ));
            const payment = paymentByOrderId.get(String(order._id));
            const seller = sellerItems[0]?.seller;
            const paymentSuccess = isSuccessfulPayment(order, payment);

            return {
                customer: formatCustomer(order.user, payment),
                seller: formatSeller(seller),
                items: sellerItems.map(item => ({
                    product: {
                        name: item.product?.title || "Unknown product",
                        price: formatMoney(item.product?.price || item.price),
                        image: item.product?.images?.[0]?.thumbnailUrl || item.product?.images?.[0]?.url || null
                    },
                    quantity: item.quantity,
                    price: formatMoney(item.price),
                    itemTotal: item.total
                })),
                payment: {
                    status: paymentSuccess ? "SUCCESS" : order.paymentStatus || payment?.status || "PENDING",
                    method: getPaymentMethod(order, payment),
                    amount: payment?.price?.amount ?? order.totalPrice?.total ?? 0,
                    currency: payment?.price?.currency || order.totalPrice?.currency || null,
                    paidAt: order.paidAt || payment?.updatedAt || null
                },
                orderStatus: paymentSuccess ? "SUCCESS" : order.status,
                totalAmount: order.totalPrice?.total ?? 0,
                currency: order.totalPrice?.currency || null,
                orderedAt: order.createdAt
            };
        });

        res.status(200).json({
            success: true,
            count: recentOrders.length,
            limit,
            orders: recentOrders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const matrixData = async (req, res) => {

    try {

        const seller = req.user.id;

        // ================= PRODUCTS =================

        const totalProducts = await productModel.countDocuments({
            seller
        });

        const lowStockProducts = await productModel.countDocuments({
            seller,
            stock: { $lte: 5 }
        });

        const outOfStockProducts = await productModel.countDocuments({
            seller,
            stock: 0
        });


        // ================= ORDERS =================

        const totalOrders = await orderModel.countDocuments({
            "items.seller": seller
        });

        const pendingOrders = await orderModel.countDocuments({
            "items.seller": seller,
            status: "pending"
        });

        const completedOrders = await orderModel.countDocuments({
            "items.seller": seller,
            status: "delivered"
        });




        // ================= REVENUE =================

        // 1. successful payments
        const successfulPayments = await paymentModel.find({
            status: "COMPLETED"
        });

        // 2. extract orderIds
        const orderIds = successfulPayments.map(
            payment => payment.orderId
        );

        // 3. get seller orders
        const orders = await orderModel.find({
            _id: { $in: orderIds },
            "items.seller": seller
        });

        // 4. calculate revenue
        let totalRevenue = 0;

        orders.forEach(order => {

            order.items.forEach(item => {

                if (
                    String(item.seller) === String(seller)
                ) {

                    totalRevenue += item.total;

                }

            });

        });



        // ================= RESPONSE =================

        res.status(200).json({

            success: true,

            analytics: {

                products: {
                    totalProducts,
                    lowStockProducts,
                    outOfStockProducts
                },

                orders: {
                    totalOrders,
                    pendingOrders,
                    completedOrders
                },

                payments: {
                    totalRevenue
                }

            }

        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};



module.exports = {
    matrixData,
    recentOrders
};
