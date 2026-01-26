const express = require('express');
const { CreateTestimony, GetTestimony } = require('../controllers/testimony');
const { GeneratePdf } = require('../controllers/generatedPdf');
const router = express.Router();
const rbacMiddleware = require('../middleware/checkPermission');
const auth = require('../middleware/authentication');

router.route('/').get(GetTestimony).post(CreateTestimony);
router
  .route('/download')
  .post(
    auth,
    rbacMiddleware.checkPermission('TESTIMONY', 'download_testimony'),
    GeneratePdf
  );

module.exports = router;


// to get testimonies of adonwload