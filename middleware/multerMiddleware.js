const multer = require('multer');
const path = require('path');
const fs = require('fs').promises; // Use promises API

// Define the directory where the files will be stored
const uploadDir = path.join(__dirname, '../uploads/profile_images');

// Ensure the directory exists (create it if not)
(async () => {
  try {
    await fs.access(uploadDir);
    console.log('Directory already exists:', uploadDir);
  } catch {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      console.log('Directory created successfully:', uploadDir);
    } catch (err) {
      console.error('Error creating directory:', err);
    }
  }
})();

// Set storage options for Multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    const fileName = Date.now() + fileExtension;
    cb(null, fileName);
  },
});

// Configure Multer
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max file size: 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPEG and PNG files are allowed!'), false);
    }
    cb(null, true);
  },
});

module.exports = upload;
