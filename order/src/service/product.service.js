const axios = require("axios");
const redis = require("../db/redis.js");

const PRODUCT_SERVICE_URL = "http://localhost:3001/api/products";
const PRODUCT_CACHE_TTL = 300;

function createServiceError(message, err) {
    const error = new Error(message);
    error.statusCode = err.response?.status || 500;
    error.details = err.response?.data;
    return error;
}

// ------------------
// Cache Keys
// ------------------
function getProductCacheKey(productId) {
    return `product:${productId}`;
}

// ------------------
// Normalize Product
// ------------------
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

// ------------------
// Cache Product
// ------------------
async function cacheProduct(product) {
    if (!product) return;

    try {
        await redis.set(
            getProductCacheKey(product.id),
            JSON.stringify(product),
            "EX",
            PRODUCT_CACHE_TTL
        );
    } catch (err) {
        console.error("Redis set failed:", err.message);
    }
}

async function getCachedProduct(cacheKey) {
    try {
        return await redis.get(cacheKey);
    } catch (err) {
        console.error("Redis get failed:", err.message);
        return null;
    }
}

async function getCachedProducts(cacheKeys) {
    try {
        if (typeof redis.mget === "function") {
            return await redis.mget(cacheKeys);
        }

        if (typeof redis.mGet === "function") {
            return await redis.mGet(cacheKeys);
        }

        return new Array(cacheKeys.length).fill(null);
    } catch (err) {
        console.error("Redis mget failed:", err.message);
        return new Array(cacheKeys.length).fill(null);
    }
}

// ======================================================
// PRODUCT APIs
// ======================================================

// Get single product
async function getProduct(productId) {
    const cacheKey = getProductCacheKey(productId);

    // 1. Redis
    const cachedProduct = await getCachedProduct(cacheKey);
    if (cachedProduct) {
        return JSON.parse(cachedProduct);
    }

    // 2. Product Service
    try {
        const response = await axios.get(`${PRODUCT_SERVICE_URL}/${productId}`);
        const product = normalizeProduct(response.data.product);

        // 3. Cache
        await cacheProduct(product);

        return product;
    } catch (err) {
        throw createServiceError("Failed to fetch product", err);
    }
}

// Get multiple products
async function getProductsBulk(productIds) {
    if (!productIds || productIds.length === 0) return [];

    const uniqueProductIds = [...new Set(productIds.map((id) => String(id)))];
    const cacheKeys = uniqueProductIds.map(getProductCacheKey);
    const cachedResults = await getCachedProducts(cacheKeys);

    const cachedProducts = {};
    const idsToFetch = [];

    cachedResults.forEach((result, index) => {
        if (result) {
            cachedProducts[uniqueProductIds[index]] = normalizeProduct(JSON.parse(result));
        } else {
            idsToFetch.push(uniqueProductIds[index]);
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

        // Cache fetched products
        await Promise.all(fetchedProducts.map(cacheProduct));
    }

    return [
        ...Object.values(cachedProducts),
        ...fetchedProducts
    ];
}

// ======================================================
// INVENTORY APIs
// ======================================================

// Reserve Inventory
async function reserveInventory(items, accessToken) {
    const response = await axios.post(`${PRODUCT_SERVICE_URL}/reserve`, {
        items
    }, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    return response.data;
}

// Release Inventory
async function releaseInventory(items, accessToken) {
    const response = await axios.post(`${PRODUCT_SERVICE_URL}/release`, {
        items
    }, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    return response.data;
}

// Deduct Inventory (after payment)
async function deductInventory(items, accessToken) {
    const response = await axios.post(`${PRODUCT_SERVICE_URL}/deduct`, {
        items
    }, {
        headers: {
             'x-service-token': ` ${accessToken}`
        }
    });
    return response.data;
}

// Restock Inventory (cancel after payment / return)
async function restockInventory(items, accessToken) {
    const response = await axios.post(`${PRODUCT_SERVICE_URL}/restock`, {
        items
    }, {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });
    return response.data;
}

// ======================================================

module.exports = {
    getProduct,
    getProductsBulk,
    reserveInventory,
    releaseInventory,
    deductInventory,
    restockInventory
};
