const mongoose = require("mongoose")
const productModel = require("../models/product.model")
const { uploadImage } = require("../services/imagekit")

function getProductStock(product) {
    let stock = (product.stock ?? 0) - (product.reserved ?? 0)
    return stock >= 0 ? stock : 0
}

function serializeProduct(product) {
    return {
        id: product._id,
        title: product.title,
        description: product.description,
        brand: product.brand,
        amount: product.price.amount,
        currency: product.price.currency,
        currency: product.price.currency,
        category: product.category,
        stock: getProductStock(product),
        seller: product.seller,
        images: product.images,
    }
}

async function createProduct(req, res) {

    try {
        const { title, description, brand, priceAmount, priceCurrency, category } = req.body
        const seller = req.user.id
        const stock = req.body.stock !== undefined ? Number(req.body.stock) : 0

        const mainImages = req.files?.url || []
        const thumbnailImages = req.files?.thumbnailUrl || req.files?.thubnailUrl || []
        const files = [...mainImages, ...thumbnailImages]

        const invalidFile = files.find((file) => !file || !file.buffer || !Buffer.isBuffer(file.buffer))
        if (invalidFile) {
            return res.status(400).json({ message: "One or more uploaded files are invalid" })
        }

        const uploadedImages = files.length
            ? await Promise.all(
                files.map((file) =>
                    uploadImage({
                        buffer: file.buffer,
                    })
                )
            )
            : []


        const product = new productModel({
            title,
            description,
            brand,
            price: {
                amount: priceAmount,
                currency: priceCurrency || "INR"
            },
            category,
            stock,
            seller,
            images: uploadedImages.map((image) => ({
                url: image.url,
                thumbnailUrl: image.thumbnailUrl,
                fileId: image.fileId
            }))
        })

        const saved = await product.save()

        return res.status(201).json({
            message: "Product created successfully",
            product: serializeProduct(saved)
        })
    } catch (err) {
        return res.status(500).json({ message: "Internal server error" })
    }
}

async function getProduct(req, res) {

    try {
        const { q, minprice, maxprice, skip = 0, limit = 20 } = req.query;

        const filter = {}

        if (q) {
            filter.$text = { $search: q }
        }

        if (minprice) {
            filter['price.amount'] = { ...filter['price.amount'], $gte: Number(minprice) }
        }

        if (maxprice) {
            filter['price.amount'] = { ...filter['price.amount'], $lte: Number(maxprice) }
        }

        const product = await productModel
            .find(filter)
            .sort({ createdAt: -1 })
            .skip(Number(skip))
            .limit(Math.min(Number(limit), 20))

        if (!product.length) {
            return res.status(200).json({
                message: "No products found",
                data: []
            })
        }

        return res.status(200).json({
            products: product.map(serializeProduct)

        });
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error"
        })
    }
}

async function getProductById(req, res) {

    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product id" })
        }
        const product = await productModel.findById(id)

        if (!product) {
            return res.status(404).json({ message: "product not found" })
        }

        res.status(200).json({ product: serializeProduct(product) })
    } catch (err) {
        res.status(500).json({ message: "Internal server error" })
    }
}

async function updateProduct(req, res) {
    try {
        const { id } = req.params

        // validate id
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product id" })
        }

        const product = await productModel.findOne({
            _id: id,
        })

        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only update your own products' })
        }

        const allowedUpdate = ["title", "description", "brand", "category", "stock"]

        for (const key of Object.keys(req.body)) {

            if (!allowedUpdate.includes(key)) continue

            product[key] = key === "stock" ? Number(req.body[key]) : req.body[key]
        }

        // support both flat payload fields and nested price object
        if (req.body.priceAmount !== undefined) {
            product.price.amount = Number(req.body.priceAmount)
        }

        if (req.body.priceCurrency !== undefined) {
            product.price.currency = req.body.priceCurrency
        }

        if (req.body.price && typeof req.body.price === "object") {
            if (req.body.price.amount !== undefined) {
                product.price.amount = Number(req.body.price.amount)
            }
            if (req.body.price.currency !== undefined) {
                product.price.currency = req.body.price.currency
            }
        }

        await product.save()

        return res.status(200).json({
            message: "Product updated successfully",
            product: serializeProduct(product)
        })

    } catch (err) {
        res.status(500).json({ message: "Internal server error" })
    }
}


async function deleteProduct(req, res) {

    try {

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product id" })
        }

        const product = await productModel.findById(id)

        if (!product) {
            return res.status(404).json({ message: "Product not found" })
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ message: "You can only delete your own products" })
        }

        await productModel.findOneAndDelete({ _id: id, seller: req.user.id })

        return res.status(200).json({ message: "Product deleted successfully" })

    }
    catch (err) {
        res.status(500).json({ message: "Internal server error" });

    };

};


async function getSeller(req, res) {
    try {
        const sellerId = req.user?.id

        if (!sellerId) {
            return res.status(401).json({
                message: "Unauthorized seller"
            })
        }
        const { skip = 0, limit = 20 } = req.query

        const products = await productModel
            .find({ seller: sellerId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Math.min(limit, 20))

        const totalProducts = await productModel.countDocuments({ seller: sellerId })


        if (!products || products.length == 0) {
            return res.status(200).json({
                message: "No products found",
                data: [],
                skip,
                limit,
                totalProducts: 0,
                totalPages: 0
            })
        }

        res.status(200).json({
            skip,
            limit,
            products: products.map(serializeProduct),
            totalProducts,
            totalPages: Math.ceil(totalProducts / limit)
        })

    } catch (err) {
        res.status(500).json({ message: "Internal server error" })
    }
}


async function getProductsBulk(req, res) {
    try {
        const { ids } = req.body // array of productIds

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                message: "Product IDs required"
            })
        }

        const hasInvalidId = ids.some((id) => !mongoose.Types.ObjectId.isValid(id))
        if (hasInvalidId) {
            return res.status(400).json({
                message: "Invalid product ID format"
            })
        }

        const products = await productModel.find({
            _id: { $in: ids }
        }).lean()

        res.status(200).json({
            products: products.map(serializeProduct)
        })

    } catch (err) {
        console.error(err)
        res.status(500).json({
            message: "Internal server error"
        })
    }
}

async function reserveInventory(req, res) {
    try {
        const { items } = req.body;

        const bulkOps = items.map(item => ({
            updateOne: {
                filter: {
                    _id: item.productId,
                    $expr: {
                        $gte: [
                            { $subtract: ["$stock", "$reserved"] },
                            item.quantity
                        ]
                    }
                },
                update: {
                    $inc: { reserved: item.quantity },
                    $set: { reservedUntil: new Date(Date.now() + 10 * 60 * 1000) } // 10 min
                }
            }
        }));

        const result = await productModel.bulkWrite(bulkOps);

        // Check if all items reserved
        if (result.modifiedCount !== items.length) {

            // Find which items were actually reserved
            const reservedProducts = await productModel.find({
                _id: { $in: items.map(i => i.productId) }
            });

            const rollbackOps = reservedProducts.map(product => {
                const item = items.find(i => String(i.productId) === String(product._id));

                return {
                    updateOne: {
                        filter: { _id: product._id },
                        update: {
                            $inc: { reserved: -item.quantity },
                            $unset: { reservedUntil: "" }
                        }
                    }
                };
            });

            await productModel.bulkWrite(rollbackOps);

            return res.status(400).json({
                message: "Some items are out of stock"
            });
        }

        res.status(200).json({ message: "Inventory reserved" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}




async function releaseInventory(req, res) {
    try {
        const { items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: "Items are required" });
        }

        const bulkOps = items.map(item => ({
            updateOne: {
                filter: {
                    _id: item.productId,
                    reserved: { $gte: item.quantity }
                },
                update: {
                    $inc: { reserved: -item.quantity }
                }
            }
        }));

        await productModel.bulkWrite(bulkOps);

        res.status(200).json({
            message: "Inventory released successfully"
        });

    } catch (error) {

        console.error(error)
        res.status(500).json({ message: error.message });
    }
}

async function deductInventory(req, res) {
    try {
        const { items } = req.body;

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

        const result = await productModel.bulkWrite(bulkOps);

        res.status(200).json({
            message: "Inventory deducted",
            updated: result.modifiedCount
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

async function restockInventory(req, res) {
    try {
        const { items } = req.body;

        const bulkOps = items.map(item => ({
            updateOne: {
                filter: { _id: item.productId },
                update: {
                    $inc: { stock: item.quantity }
                }
            }
        }));

        await productModel.bulkWrite(bulkOps);

        res.status(200).json({
            message: "Inventory restocked"
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    createProduct,
    getProduct,
    getProductById,
    updateProduct,
    deleteProduct,
    getSeller,
    getProductsBulk,
    reserveInventory,
    releaseInventory,
    deductInventory,
    restockInventory
}
