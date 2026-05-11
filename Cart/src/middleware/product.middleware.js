const productService = require("./../service/product.service")

async function productIdMiddleware(req, res, next) {
    const productId = req.params.productId || req.body.productId

    try {
        const product = await productService.getProduct(productId)
        req.product = product
        return next()
    } catch (err) {
        return res.status(404).json({
            message: "Product not found"
        })
    }
}

module.exports = productIdMiddleware