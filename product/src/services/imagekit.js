const ImageKit = require("imagekit")
const { v4: uuidv4 } = require("uuid")

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
})

async function uploadImage({ buffer }) {

    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new Error("file path is required")
    }
    try {
        const response = await imagekit.upload({
            file: buffer,
            fileName: `${uuidv4()}.jgp`,
            folder: "/marketPlace/product",
            useUniqueFileName: true
        })
        if (!response || !response.url) {
            throw new Error("Image upload failed")
        }
        return {
            url: response.url,
            thumbnailUrl: response.thumbnailUrl || "",
            fileId: response.fileId
        }
    } catch (error) {
        throw error
    }

}

module.exports = {
    uploadImage
}