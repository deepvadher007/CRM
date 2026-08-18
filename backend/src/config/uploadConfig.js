const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (file.mimetype !== allowedMime) {
    const error = new Error('Invalid file type. Only .xlsx files are accepted');
    error.statusCode = 400;
    return cb(error, false);
  }
  if (!file.originalname.endsWith('.xlsx')) {
    const error = new Error('Invalid file type. Only .xlsx files are accepted');
    error.statusCode = 400;
    return cb(error, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

module.exports = { upload };
