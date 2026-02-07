const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for memory storage (we'll process before saving)
const storage = multer.memoryStorage();

// File filter - only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'), false);
    }
};

// Multer upload instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max
    },
});

/**
 * Process and save profile picture
 * @param {Buffer} buffer - Image buffer from multer
 * @param {number} userId - User ID for filename
 * @returns {string} Filename of saved image
 */
const processProfilePic = async (buffer, userId) => {
    const filename = `profile_${userId}_${Date.now()}.jpg`;
    const filepath = path.join(uploadsDir, filename);

    await sharp(buffer)
        .resize({
            width: 200,
            height: 200,
            fit: 'cover',
            withoutEnlargement: true, // Don't upscale small images
        })
        .jpeg({ quality: 80 })
        .toFile(filepath);

    return filename;
};

/**
 * Delete old profile picture
 * @param {string} filename - Old filename to delete
 */
const deleteProfilePic = (filename) => {
    if (!filename) return;
    const filepath = path.join(uploadsDir, filename);
    if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
    }
};

module.exports = {
    upload,
    processProfilePic,
    deleteProfilePic,
    uploadsDir,
};
