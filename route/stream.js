const express = require('express');
const {
  GetAuth,
  CreateStream,
} = require('../controllers/stream');
const upload = require('../middleware/multer');
const router = express.Router();

router.route('/').post(upload.single('thumbnail'), CreateStream);
router.route('/auth').get(GetAuth);

module.exports = router;
