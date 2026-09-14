const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Folder where uploaded images are stored (used by local storage mode).
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Only allow images. Rejects executables, scripts, etc.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file
const MAX_FILES = 6; // maximum number of photos per listing

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
    const safeName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(null, true);
  }
  const err = new Error('Only JPG, JPEG, PNG or WEBP images are allowed.');
  err.code = 'UNSUPPORTED_FILE';
  cb(err);
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter
});

/**
 * Wrapper that catches Multer errors and returns friendly messages
 * instead of crashing the server.
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Image is too large. Maximum size is 5 MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: `You can upload a maximum of ${MAX_FILES} images.` });
    }
    return res.status(400).json({ success: false, message: 'Upload failed. Please try again.' });
  }
  if (err && err.code === 'UNSUPPORTED_FILE') {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
};

/**
 * Optional image re-sizer used before saving to the database.
 * Uses the browser-safe approach: if we can't resize, keep the original.
 */
const normalizeImagePaths = (files) => {
  if (!files || files.length === 0) return [];
  return files.map((f) => `/uploads/${f.filename}`);
};

module.exports = { upload, handleUploadError, normalizeImagePaths, MAX_FILE_SIZE, MAX_FILES };