const {
  createRole,
  getRoles,
  updateRole,
  deleteARole,
} = require('../controllers/role');
const rbacMiddleware = require('../middleware/checkPermission');
const express = require('express');

const router = express.Router();

router
  .route('/')
  .post(rbacMiddleware.checkPermission('SYSTEM', 'create_roles'), createRole)
  .get(rbacMiddleware.checkPermission('SYSTEM', 'read_roles'), getRoles);
router
  .route('/:id')
  .put(rbacMiddleware.checkPermission('SYSTEM', 'update_roles'), updateRole)
  .post(
    rbacMiddleware.checkPermission('SYSTEM', 'delete_roles'),
    deleteARole
  );

module.exports = router;
