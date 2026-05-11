const jwt = require("jsonwebtoken");
const redis = require("../db/redis");

async function authMiddleware(req, res, next) {
    try {
        const token = req.cookies.accessToken;

        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // 🔐 2️⃣ Verify access token
        const decoded = jwt.verify(token, process.env.ACCESS_SECRET);

        req.user = decoded;

        next();

    } catch (err) {
        return res.status(401).json({ message: "Unauthorized" });
    }
}

module.exports = {
    authMiddleware
};