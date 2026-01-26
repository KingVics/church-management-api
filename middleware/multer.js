const multer = require('multer');
const path = require('path');

// Set up storage and file naming
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-thumbnail${ext}`);
  },
});

const upload = multer({ storage });

module.exports = upload;
