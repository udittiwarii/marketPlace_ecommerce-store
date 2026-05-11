const JWT = require('jsonwebtoken');

function readAccessToken(req) {
    if (req.cookies?.accessToken) return req.cookies.accessToken

    const authHeader = req.headers.authorization || ""
    if (authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7)
    }

    return null
}

function createAuthMiddleware(roles = ["user"]) {
    return function authMiddleware(req, res, next) {
        const token = readAccessToken(req)

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        try {

            const decoded = JWT.verify(token, process.env.JWT_SECRET)

            if (!roles.includes(decoded.role)) {
                return res.status(403).json({ message: 'Insufficient permissions' })
            }


            req.user = decoded
            req.user.id = decoded.id || decoded._id
            next()

        } catch (err) {
            return res.status(401).json({ message: 'Invalid token' })
        }
    }
}


module.exports = createAuthMiddleware
