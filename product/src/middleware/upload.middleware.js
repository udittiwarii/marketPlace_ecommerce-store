const multer = require("multer")

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
])

const maxFileSizeBytes = Number(process.env.MAX_IMAGE_SIZE_MB || 8) * 1024 * 1024

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 6,
        fileSize: maxFileSizeBytes
    },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return cb(new Error("Only image files are allowed (jpeg, png, webp, gif)"))
        }
        cb(null, true)
    }
})

const uploadProductImages = upload.fields([
    { name: "url", maxCount: 5 },
    { name: "thumbnailUrl", maxCount: 1 },
    { name: "thubnailUrl", maxCount: 1 }
])

module.exports = {
    uploadProductImages
}
