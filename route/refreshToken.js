const express = require('express');
const refreshToken = require('../controllers/refreshtoken');

const router = express.Router();

router.get('/', refreshToken);

module.exports = router;
