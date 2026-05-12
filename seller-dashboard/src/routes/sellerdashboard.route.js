const express = require('express');
const { createAuthMiddleware } = require('../middleware/product.middleware')
const controller = require('../controller/sellerdashboard.controller')

const router = express.Router();


router.get('/matrix', createAuthMiddleware(['seller']), controller.matrixData)
router.get('/recent-orders', createAuthMiddleware(['seller']), controller.recentOrders)


module.exports = router;
