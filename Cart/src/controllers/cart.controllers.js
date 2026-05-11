const cartModel = require("./../models/cart.model")
const productService = require("./../service/product.service")

function getCartByUser(userId) {
    return cartModel.findOne({ user: userId })
}

function calculateCartTotals(items, fallbackAmount) {
    return items.reduce(
        (totals, item) => {
            totals.totalItems += item.quantity
            totals.totalAmount += item.quantity * item.amount || fallbackAmount
            return totals
        },
        { totalItems: 0, totalAmount: 0 }
    )
}

function assignCartTotals(cart, fallbackAmount) {
    const { totalItems, totalAmount } = calculateCartTotals(
        cart.items,
        fallbackAmount
    )

    cart.totalItems = totalItems
    cart.totalAmount = totalAmount
}

function buildProductMap(products) {
    return Object.fromEntries(
        products
            .filter(product => product && (product.id || product._id))
            .map(product => [String(product.id || product._id), product])
    )
}


// api controller start here

async function addItemToCart(req, res) {
    try {
        const { productId, quantity } = req.body
        const product = req.product
        const user = req.user.id
        let cart = await getCartByUser(user)

        if (!cart) {
            cart = new cartModel({ user, items: [] })
        }

        const items = cart.items
        const existingItem = items.find(
            (item) => item.productId.toString() === productId
        )
        const nextQuantity = (existingItem?.quantity || 0) + quantity

        if (nextQuantity > product.stock) {
            return res.status(409).json({
                message: "Requested quantity not available"
            })
        }

        if (existingItem) {
            existingItem.quantity = nextQuantity
            existingItem.amount = product.amount; // update latest amount
        } else {
            items.push({ productId, quantity, amount: product.amount })
        }

        assignCartTotals(cart, product.amount)

        await cart.save()

        res.status(201).json({
            message: "Item added to cart",
            cart
        })
    } catch (err) {

        res.status(500).json({
            message: "Internal server error"
        })
    }
}

async function updateItemToCart(req, res) {
    try {
        const userId = req.user.id
        const productId = req.params.productId
        const { quantity } = req.body
        const product = req.product

        // find the user cart
        const cart = await getCartByUser(userId)

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" })
        }

        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        )

        if (itemIndex == -1) {
            return res.status(404).json({
                message: "Product not found"
            })
        }


        if (quantity <= 0) {
            // remove cart cause quantity is zero
            cart.items.splice(itemIndex, 1)
        } else {
            if (quantity > product.stock) {
                return res.status(409).json({
                    message: "Requested quantity not available"
                })
            }

            // update product 
            cart.items[itemIndex].quantity = quantity
            cart.items[itemIndex].amount = product.amount
        }

        assignCartTotals(cart)

        await cart.save()

        res.status(200).json({
            message: "Cart Updated",
            cart
        })
    } catch (err) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
}


async function getCart(req, res) {
    try {
        const userID = req.user.id

        const cart = await getCartByUser(userID)


        if (!cart) {
            return res.status(200).json({
                message: "cart get successfully",
                cart: {
                    items: [],
                    totalAmount: 0,
                    totalItems: 0
                }
            })
        }

        if (cart.items.length === 0) {
            const previousTotalItems = cart.totalItems || 0;
            const previousTotalAmount = cart.totalAmount || 0;

            cart.totalItems = 0;
            cart.totalAmount = 0;

            if (previousTotalItems !== 0 || previousTotalAmount !== 0) {
                await cart.save();
            }

            return res.status(200).json({
                message: "cart get successfully",
                cart
            });
        }

        const productIds = cart.items.map(item => item.productId);
        const products = await productService.getProductsBulk(productIds);

        const productMap = buildProductMap(products)

        let totalItems = 0
        let totalAmount = 0
        let updated = false
        const previousTotalItems = cart.totalItems || 0
        const previousTotalAmount = cart.totalAmount || 0

        for (let item of cart.items) {
            const product = productMap[item.productId.toString()]

            if (product && item.amount !== product.amount) {
                item.amount = product.amount
                updated = true
            }

            totalItems += item.quantity
            totalAmount += item.quantity * item.amount
        }

        cart.totalAmount = totalAmount
        cart.totalItems = totalItems

        if (
            updated ||
            previousTotalItems !== totalItems ||
            previousTotalAmount !== totalAmount
        ) {
            await cart.save()
        }

        res.status(200).json({
            message: "cart get successfully",
            cart
        })

    } catch (err) {
        res.status(500).json({ message: "Internal server error" })
    }
}

async function removeItemFromCart(req, res) {
    try {
        const userId = req.user.id
        const productId = req.params.productId

        const cart = await getCartByUser(userId)

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found"
            })
        }

        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId
        )

        if (itemIndex === -1) {
            return res.status(404).json({
                message: "Product not found"
            })
        }

        cart.items.splice(itemIndex, 1)

        assignCartTotals(cart)

        await cart.save()

        res.status(200).json({
            message: "Item removed from cart",
            cart
        })
    } catch (err) {
        res.status(500).json({
            message: "Internal server error"
        })
    }
}


async function clearCart(req, res) {
    try {
        const userId = req.user.id

        const cart = await cartModel.findOneAndUpdate(
            { user: userId },
            { items: [], totalItems: 0, totalAmount: 0 },
            { returnDocument: "after" }
        )

        if (!cart) {
            return res.status(404).json({
                message: "Cart not found"
            })
        }

        res.status(200).json({
            message: "Cart cleared",
            cart
        })

    } catch (err) {
        res.status(500).json({ message: "Internal server error" })
    }
}

module.exports = {
    addItemToCart,
    updateItemToCart,
    getCart,
    removeItemFromCart,
    clearCart
}
