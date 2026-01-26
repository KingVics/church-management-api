const express = require('express');
const rbacMiddleware = require('../middleware/checkPermission');
const {
  GetCallLog,
  UpdateCallStatus,
  UpdateUserStatus,
  RedialUserStatus,
} = require('../controllers/callLogs');
const router = express.Router();

router
  .route('/log')
  .get(rbacMiddleware.checkPermission('SYSTEM', 'call_report'), GetCallLog);

router
  .route('/update-log/:id')
  .put(
    rbacMiddleware.checkPermission('SYSTEM', 'call_report'),
    UpdateCallStatus
  );

router
  .route('/update-call/:id')
  .put(
    rbacMiddleware.checkPermission('SYSTEM', 'call_report'),
    UpdateUserStatus
  );

router
  .route('/redial-call/:id')
  .put(
    rbacMiddleware.checkPermission('SYSTEM', 'call_report'),
    RedialUserStatus
  );

module.exports = router;
