const express = require("express")

const productController = require("../controller/product.controller")
const authMiddleware = require("../middleware/product.middleware")
const { uploadProductImages } = require("../middleware/upload.middleware")

// validation helpers
const validator = require("../validators/product.validator")

const router = express.Router()

// POST /api/products/ - create a new product and upload an image if provided
router.post(
  "/",
  authMiddleware.createAuthMiddleware(["admin", "seller"]),
  uploadProductImages,
  validator.productValidationRules,
  productController.createProduct
)


// GET /api/products/ - serach the product using query q 
router.get("/", productController.getProduct)



// PATCH /api/products/:id for the update product by the seller
router.patch("/:id", authMiddleware.createAuthMiddleware(["seller"]), validator.updateProductValidation, productController.updateProduct)

// DELETE /api/products/:id for the delete api 
// ------>>>>>> After i build the order survice then i want to update the feature in the delete api for the soft delete and the hard delete
router.delete("/:id", authMiddleware.createAuthMiddleware(["seller"]), productController.deleteProduct)

// GEt /api/products/seller get the seller product 
router.get('/seller', authMiddleware.createAuthMiddleware(["seller"]), productController.getSeller)




// Inventory
// Poet /reserve for the reserve the stock in order
router.post("/reserve", authMiddleware.createAuthMiddleware(["user"]), productController.reserveInventory);

// post /release stock for the order cancelation
router.post("/release", authMiddleware.createAuthMiddleware(["user"]), productController.releaseInventory);

// Post /deduct for deduct the stock on the time of confirm order
router.post("/deduct", authMiddleware.serviceAuthMiddleware, productController.deductInventory);

// post /restock for the restore the dedcut stock
router.post("/restock", authMiddleware.createAuthMiddleware(["user"]), productController.restockInventory);


// post /products as a bulk 
router.post("/bulk", productController.getProductsBulk);

// GET /api/products/:id
router.get("/:id", productController.getProductById)
module.exports = router
