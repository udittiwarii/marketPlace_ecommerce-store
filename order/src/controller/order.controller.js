const orderModel = require("./../models/order.model")
const cartService = require('./../service/cart.service')
const productService = require('./../service/product.service');
const priceService = require("./../service/pricing.service")
const { publishToQueue } = require("./../broker/broker");

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

function getCustomerSnapshot(user) {
    const name = [user?.fullName?.firstName, user?.fullName?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

    return {
        name: name || user?.username || "",
        username: user?.username || "",
        email: user?.email || ""
    };
}
function publishOrderForDashboard(order) {
    publishToQueue("SELLER-DASHBOARD.NEW_ORDER", order)
        .catch((error) => {
            console.error("Failed to publish seller dashboard order:", error.message);
        });
}
async function updateOrderStatus(orderId, status) {
    const order = await orderModel.findById(orderId);

    if (!order) {
        throw new Error("Order not found");
    }

    order.status = status;
    order.statusHistory.push({ status });

    await order.save();

    return order;
}

async function createOrderBYFromCart(req, res) {
    try {
        const userId = req.user.id;
        const accessToken = readAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // 1. Get cart
        const cart = await cartService.getUserCart(accessToken);

        if (!cart.items || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        // 2. Get products
        const productIds = cart.items.map(item => item.productId);
        const products = await productService.getProductsBulk(productIds);

        // 3. Create order items
        const productMap = {};
        products.forEach(p => {
            productMap[p.id] = p;
        });

        const orderItems = cart.items.map(cartItem => {
            const product = productMap[cartItem.productId];

            if (!product) {
                throw new Error("Product not found");
            }

            if (product.stock < cartItem.quantity) {
                throw new Error(`Not enough stock for ${product.title}`);
            }

            return {
                product: product.id,
                seller: product.seller,
                quantity: cartItem.quantity,
                price: {
                    amount: product.amount,
                    currency: product.currency
                },
                total: product.amount * cartItem.quantity
            };
        });

        // 4. Pricing
        const price = priceService.calculatePricing(orderItems);
        const orderCurrency = orderItems[0]?.price?.currency || "INR";

        if (orderItems.some((item) => item.price.currency !== orderCurrency)) {
            return res.status(400).json({
                message: "Cart contains mixed currencies"
            });
        }

        const totalPrice = {
            subtotal: price.subtotal,
            tax: price.tax,
            shipping: price.shipping,
            total: price.total,
            currency: orderCurrency
        };

        // 5. Reserve inventory
        const inventoryItems = orderItems.map(item => ({
            productId: item.product,
            quantity: item.quantity
        }));

        await productService.reserveInventory(inventoryItems, accessToken);

        let order;

        try {
            // 6. Create order
            order = await orderModel.create({
                user: userId,
                customerSnapshot: getCustomerSnapshot(req.user),
                items: orderItems,
                totalPrice
            });
        } catch (err) {
            try {
                await productService.releaseInventory(inventoryItems, accessToken);
            } catch (releaseErr) {
                console.error("Failed to release reserved inventory:", releaseErr.message);
            }

            throw err;
        }

        res.status(201).json({
            message: "Order created",
            orderId: order._id,
            total: order.totalPrice.total,
            status: order.status,

        });

        publishOrderForDashboard(order);

        // 9. Clear cart async
        cartService.clearCart(accessToken)
            .catch(err => console.error("Cart clear failed:", err.message));


    } catch (err) {
        return res.status(err.statusCode || 500).json({
            message: err.message
        });
    }
}


async function createOrderBuyNow(req, res) {
    try {
        const userId = req.user.id;
        const accessToken = readAccessToken(req);

        const { productId, quantity } = req.body;
        const parsedQuantity = Number(quantity);

        if (!accessToken) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!productId || quantity === undefined) {
            return res.status(400).json({ message: "Product ID and quantity are required" });
        }

        if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
            return res.status(400).json({ message: "Quantity must be a positive integer" });
        }

        let product;

        try {
            product = await productService.getProduct(productId);
        } catch (err) {
            if (err.statusCode === 404) {
                return res.status(404).json({ message: "Product not found" });
            }

            throw err;
        }

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (product.stock < parsedQuantity) {
            return res.status(400).json({ message: "Not enough stock available" });
        }

        const orderItems = [{
            product: productId,
            seller: product.seller,
            quantity: parsedQuantity,
            price: {
                amount: product.amount,
                currency: product.currency
            },
            total: product.amount * parsedQuantity
        }];

        const price = priceService.calculatePricing(orderItems);

        const totalPrice = {
            subtotal: price.subtotal,
            tax: price.tax,
            shipping: price.shipping,
            total: price.total,
            currency: product.currency
        };

        const inventoryItems = [{ productId, quantity: parsedQuantity }];
        await productService.reserveInventory(inventoryItems, accessToken);

        let order;

        try {
            order = await orderModel.create({
                user: userId,
                customerSnapshot: getCustomerSnapshot(req.user),
                items: orderItems,
                totalPrice
            });
        } catch (err) {
            try {
                await productService.releaseInventory(inventoryItems, accessToken);
            } catch (releaseErr) {
                console.error("Failed to release reserved inventory:", releaseErr.message);
            }

            throw err;
        }

        publishOrderForDashboard(order);

        res.status(201).json({
            message: "Order created",
            orderId: order._id,
            total: order.totalPrice.total,
            status: order.status,
        });


    } catch (err) {
        return res.status(err.statusCode || 500).json({
            message: err.message
        });
    }
}

async function getMyOrders(req, res) {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10 } = req.query;

        const skip = (page - 1) * limit;

        const orders = await orderModel.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const totalOrders = await orderModel.countDocuments({ user: userId });

        if (orders.length === 0) {
            return res.status(200).json({
                page: Number(page),
                limit: Number(limit),
                total: 0,
                orders: []
            });
        }

        res.status(200).json({
            page: Number(page),
            limit: Number(limit),
            total: totalOrders,
            orders
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            message: err.message
        });
    }
}

async function getOrderById(req, res) {
    try {
        const userId = req.user.id;
        const orderId = req.params.orderId;

        const order = await orderModel.findById(orderId);



        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (String(order.user) !== userId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        res.status(200).json(
            {
                userId: order.user,
                orderId: order._id,
                status: order.status,
                timeline: order.statusHistory.map(sh => ({
                    status: sh.status,
                    updatedAt: sh.updatedAt
                })),
                paymentSummary: order.paymentSummary,
                totalPrice: order.totalPrice
            }
        );
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            message: err.message
        });
    }
}


async function cancelOrder(req, res) {
    try {
        const userId = req.user.id;
        const orderId = req.params.id;
        const accessToken = readAccessToken(req);

        if (!accessToken) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (String(order.user) !== userId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (order.status !== "PENDING" || order.paymentSummary?.captured) {
            return res.status(409).json({ message: "Order cannot be cancelled" });
        }


        await productService.releaseInventory(
            order.items.map(item => ({
                productId: item.product,
                quantity: item.quantity
            })), accessToken
        );

        order.status = "CANCELLED";

        order.statusHistory.push({ status: "CANCELLED" });

        await order.save();

        res.status(200).json({
            message: "Order cancelled",
            status: order.status
        });
    } catch (err) {
        console.error("Cancel order failed:", err);
        return res.status(err.statusCode || 500).json({
            message: err.message
        });
    }
}

async function updateOrderAddress(req, res) {
    try {
        const userId = req.user.id;
        const orderId = req.params.id;
        const requestedShippingAddress = req.body.shippingAddress;
        const address = requestedShippingAddress?.address || requestedShippingAddress;

        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        // Only allow address update if order is still pending and not yet processed for shipping
        if (order.user.toString() !== userId) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (order.paymentSummary?.captured || ["SHIPPED", "DELIVERED", "CANCELLED", "PROCESSING"].includes(order.status)) {
            return res.status(409).json({
                message: "Address cannot be updated at this stage"
            });
        }

        order.shippingAddress = {
            street: address.street,
            city: address.city,
            state: address.state,
            country: address.country,
            zipCode: address.zipCode,
            phone: address.phone
        };

        await order.save();

        res.status(200).json({
            message: "Delivery address updated",
            shippingAddress: requestedShippingAddress?.address
                ? { address: order.shippingAddress }
                : order.shippingAddress
        });
    } catch (err) {
        console.error("Update order address failed:", err);
        return res.status(err.statusCode || 500).json({
            message: err.message
        });
    }
}

async function markOrderAsPaid(req, res) {
    const serviceToken = req.headers['x-service-token'];
    try {
        const orderId = req.params.id;

        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // ✅ Idempotency check
        if (order.paymentStatus === "SUCCESS") {
            return res.status(200).json({
                message: "Order already marked as paid"
            });
        }

        if (order.status !== "PENDING") {
            return res.status(409).json({
                message: "Only pending orders can be marked as paid"
            });
        }

        // ✅ Update payment
        order.paymentStatus = "SUCCESS";
        order.paymentSummary = {
            captured: true,
            capturedAt: new Date()
        };

        // ✅ Update order status
        order.status = "CONFIRMED";

        order.statusHistory.push({
            status: "CONFIRMED"
        });

        // 🔥 Deduct inventory (ONLY ONCE)
        await productService.deductInventory(
            order.items.map(item => ({
                productId: item.product,
                quantity: item.quantity
            })),
            serviceToken
        );

        await order.save();


        res.status(200).json({
            message: "Order marked as paid",
            orderId: order._id
        });


    } catch (err) {
        res.status(500).json({
            message: err.message
        })
    }
}

module.exports = {
    createOrderBYFromCart,
    createOrderBuyNow,
    getMyOrders,
    getOrderById,
    cancelOrder,
    updateOrderAddress,
    markOrderAsPaid
}
