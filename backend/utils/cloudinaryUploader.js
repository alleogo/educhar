const cloudinary = require("cloudinary").v2;
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Accepted upload types. The browser's `accept=` attribute is only a hint, so the server checks.
const ALLOWED = {
    image: { types: ["image/jpeg", "image/png", "image/gif", "image/webp"], maxMB: 5 },
    video: { types: ["video/mp4", "video/webm", "video/quicktime"], maxMB: 100 },
};

/**
 * Throws an Error with .status = 400 if `file` isn't an allowed type/size for `kind`
 * ("image" | "video"). Controllers turn that into a 400 response.
 */
function validateFile(file, kind) {
    const rule = ALLOWED[kind];
    if (!file || !rule.types.includes(file.mimetype)) {
        throw Object.assign(new Error(`Invalid ${kind} file. Allowed: ${rule.types.join(", ")}.`), { status: 400 });
    }
    if (file.size > rule.maxMB * 1024 * 1024) {
        throw Object.assign(new Error(`File too large (max ${rule.maxMB} MB).`), { status: 400 });
    }
}

/**
 * Uploads a validated file. `kind` is "image" or "video" and is passed to Cloudinary as the
 * resource_type explicitly (no "auto"), so a renamed file can't be stored as some other type.
 */
const uploadImageToCloudinary = async (file, folder, height, quality, kind = "image") => {
    validateFile(file, kind);
    const options = { folder, resource_type: kind };
    if(height) options.height = height;
    if(quality) options.quality = quality;

    return await cloudinary.uploader.upload(file.tempFilePath, options);
}

/**
 * Best-effort delete of an asset we uploaded, given its secure_url.
 * URL shape: https://res.cloudinary.com/<cloud>/<image|video>/upload/v<version>/<public_id>.<ext>
 * Never throws: a failed cleanup must not fail the user's request.
 */
async function deleteFromCloudinary(url) {
    try {
        if (!url || !url.includes(`res.cloudinary.com/${process.env.CLOUDINARY_NAME}/`)) return;
        const match = url.match(/\/(image|video)\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i);
        if (!match) return;
        const [, resourceType, publicId] = match;
        await cloudinary.uploader.destroy(decodeURIComponent(publicId), { resource_type: resourceType });
    } catch (error) {
        console.error("Cloudinary cleanup failed:", error.message);
    }
}

module.exports = uploadImageToCloudinary;
module.exports.validateFile = validateFile;
module.exports.deleteFromCloudinary = deleteFromCloudinary;
