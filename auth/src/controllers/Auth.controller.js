const userModel = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const redis = require("../db/redis")
const crypto = require('crypto')
const { publishToQueue } = require('./../broker/broker')

function createAccessToken(user, expiresIn = "15m") {
    return jwt.sign(
        { id: user._id, username: user.username, email: user.email, role: user.role },
        process.env.ACCESS_SECRET,
        { expiresIn }
    );
}

async function registerUser(req, res) {

    try {

        const { username, email, password, fullName: { firstName, lastName }, role } = req.body;

        const isuserExists = await userModel.findOne({ $or: [{ username }, { email }] });
        if (isuserExists) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        const hash = await bcrypt.hash(password, 10);

        const newUser = await userModel.create({
            username,
            email,
            password: hash,
            fullName: {
                firstName,
                lastName
            },
            role: role || 'user'
        })


        // Publish user registration events to RabbitMQ
        await Promise.all([
            publishToQueue('AUTH_NOTIFICATIONS.user_registration', {
                userId: newUser._id,
                username: newUser.username,
                email: newUser.email,
                fullName: newUser.fullName
            }),
            publishToQueue('SELLER_DESHBOARD.new_user', newUser),
            publishToQueue('SELLER_DESHBOARD.new_seller', newUser)
        ]);

        // 🟢 1. Create Access Token (15 min)
        const accessToken = createAccessToken(newUser);

        // 🔵 2. Create Random Refresh Token
        const refreshToken = crypto.randomBytes(64).toString("hex");

        // 🔐 3. Hash Refresh Token
        const hashedRefreshToken = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        // 🧠 4. Store in Redis with expiry 7 days
        await redis.set(
            `refresh:${hashedRefreshToken}`,
            newUser._id.toString(),
            "EX",
            7 * 24 * 60 * 60
        );

        // 🍪 5. Send Cookies
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });


        res.status(201).json({
            message: 'User registered successfully', user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                addresses: newUser.addresses
            }
        })

    } catch (err) {
        console.error("Error in registerUser:", err);
        res.status(500).json({ message: 'Internal server error' });
    }
}


async function loginUser(req, res) {
    try {
        const { username, email, password } = req.body;
        const user = await userModel.findOne({ $or: [{ username }, { email }] }).select('+password');


        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }



        // 🟢 1. Create Access Token (15 min)
        const accessToken = createAccessToken(user);
        // 🔵 2. Create Random Refresh Token
        const refreshToken = crypto.randomBytes(64).toString("hex");

        // 🔐 3. Hash Refresh Token
        const hashedRefreshToken = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        // 🧠 4. Store in Redis with expiry 7 days
        await redis.set(
            `refresh:${hashedRefreshToken}`,
            user._id.toString(),
            "EX",
            7 * 24 * 60 * 60
        );

        // 🍪 5. Send Cookies
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                addresses: user.addresses
            }

        })

    } catch (err) {

        console.error("Error in loginUser:", err);
        res.status(500).json({ message: 'Internal server error' });

    }
}


async function getUserController(req, res) {
    try {
        const userId = req.user?.id

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' })
        }

        const user = await userModel.findById(userId).select('-password')

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.status(200).json({
            message: 'User data retrieved successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        })
    } catch (err) {
        console.error("Error in getUserController:", err);
        res.status(500).json({ message: 'Internal server error' });
    }
}


async function logoutUser(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            const hashedToken = crypto
                .createHash("sha256")
                .update(refreshToken)
                .digest("hex");

            await redis.del(`refresh:${hashedToken}`);
        }

        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");

        res.status(200).json({ message: "Logout successful" });

    } catch (err) {
        res.status(500).json({ message: 'Internal server error' });
        // Even if there's an error, we still want to clear the cookie
    }
}

async function getAddressesController(req, res) {
    try {
        const userId = req.user.id
        const user = await userModel.findById(userId).select('addresses')

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.status(200).json({
            message: 'Addresses retrieved successfully',
            addresses: user.addresses
        })

    } catch (err) {
        console.error("Error in getAddressesController:", err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function addAddressController(req, res) {
    try {
        const userId = req.user.id
        const { street, city, state, zipCode, phone, country, isDefault } = req.body


        const user = await userModel.findOneAndUpdate({
            _id: userId
        }, {
            $push: {
                addresses: {
                    street,
                    city,
                    state,
                    zipCode,
                    phone,
                    country,
                    isDefault
                }
            }
        }, { new: true })

        if (!user) {
            return res.status(404).json({ message: 'User not found' })
        }

        res.status(201).json({
            message: 'Address added successfully',
            addresses: user.addresses
        })

    } catch (err) {
        console.error("Error in addAddressController:", err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function deleteAddressController(req, res) {
    try {
        const userId = req.user.id
        const addressId = req.params.addressId

        const isAddressExists = await userModel.findOne({ _id: userId, 'addresses._id': addressId })

        if (!isAddressExists) {
            return res.status(404).json({ message: 'Address not found' })
        }

        const user = await userModel.findOneAndUpdate({
            _id: userId
        }, {
            $pull: {
                addresses: { _id: addressId }
            }
        }, { new: true })

        if (!user) {
            return res.status(404).json({ message: 'User not found or address not found' })
        }

        const isAddress = user.addresses.some(addr => addr._id.toString() === addressId)

        if (isAddress) {
            return res.status(404).json({ message: 'Failed to delete address' })
        }

        res.status(200).json({
            message: 'Address deleted successfully',
            addresses: user.addresses
        })

    } catch (err) {
        console.error("Error in deleteAddressController:", err);
        res.status(500).json({ message: 'Internal server error' });
    }
}

async function refreshToken(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // 🔐 Hash the incoming refresh token
        const hashedRefreshToken = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        // 🔍 Check if the hashed refresh token exists in Redis
        const userId = await redis.get(`refresh:${hashedRefreshToken}`);

        if (!userId) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }


        // 🔁 ROTATION — delete old
        await redis.del(`refresh:${hashedRefreshToken}`);

        const user = await userModel.findOne({ _id: userId });


        // create new access
        const newAccessToken = createAccessToken(user, "7d");

        // create new refresh
        const newRefreshToken = crypto.randomBytes(64).toString("hex");

        const newHashed = crypto
            .createHash("sha256")
            .update(newRefreshToken)
            .digest("hex");

        await redis.set(
            `refresh:${newHashed}`,
            userId,
            "EX",
            7 * 24 * 60 * 60
        );

        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000
        });

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({ message: "Token refreshed" });


    } catch (err) {
        console.error("Error in refreshToken:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    registerUser,
    loginUser,
    getUserController,
    logoutUser,
    getAddressesController,
    addAddressController,
    deleteAddressController,
    refreshToken
}
