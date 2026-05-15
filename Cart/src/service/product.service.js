const axios = require("axios");
const redis = require("./../db/redis");

const PRODUCT_SERVICE_URL = process.env.product_service_url || "http://localhost:3001/api/products";
const PRODUCT_CACHE_TTL = 300;

function getProductCacheKey(productId) {
    return `product:${productId}`;
}

function normalizeProduct(product) {
    if (!product) return null;

    const amount =
        product.amount !== undefined
            ? product.amount
            : product.price?.amount;

    const currency =
        product.currency !== undefined
            ? product.currency
            : product.price?.currency;

    return {
        id: product.id || product._id?.toString() || product._id,
        title: product.title,
        description: product.description,
        brand: product.brand,
        amount,
        currency,
        category: product.category,
        stock: product.stock ?? 0,
        seller: product.seller,
        images: product.images || [],
    };
}

async function cacheProduct(product) {
    if (!product) {
        return;
    }

    await redis.set(
        getProductCacheKey(product.id),
        JSON.stringify(product),
        "EX",
        PRODUCT_CACHE_TTL
    );
}

// Single product (used in middleware)
async function getProduct(productId) {
    const cacheKey = getProductCacheKey(productId);

    // 1. Check Redis
    const cachedProduct = await redis.get(cacheKey);
    if (cachedProduct) {
        return JSON.parse(cachedProduct);
    }

    // 2. Call Product Service
    const response = await axios.get(`${PRODUCT_SERVICE_URL}/${productId}`);
    const product = normalizeProduct(response.data.product);

    // 3. Save in Redis
    await cacheProduct(product);

    return product;
}


// Bulk products (used in GET /cart)
async function getProductsBulk(productIds) {
    if (!productIds || productIds.length === 0) {
        return [];
    }
    const cacheKeys = productIds.map(getProductCacheKey);
    const cachedResults = await redis.mget(cacheKeys);

    const cachedProducts = {};
    const idsToFetch = [];

    cachedResults.forEach((result, index) => {
        if (result) {
            cachedProducts[productIds[index]] = normalizeProduct(JSON.parse(result));
        } else {
            idsToFetch.push(productIds[index]);
        }
    });

    let fetchedProducts = [];

    if (idsToFetch.length > 0) {

        const response = await axios.post(`${PRODUCT_SERVICE_URL}/bulk`, {
            ids: idsToFetch
        });

        fetchedProducts = response.data.products
            .map(normalizeProduct)
            .filter(Boolean);

        // Save in Redis
        await Promise.all(fetchedProducts.map(cacheProduct));
    }


    return [
        ...Object.values(cachedProducts),
        ...fetchedProducts
    ];
}

module.exports = {
    getProduct,
    getProductsBulk
};
