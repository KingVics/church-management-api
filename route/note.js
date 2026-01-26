const {
  SaveNote,
  GetNote,
  DeleteNote,
  UpdateNote,
} = require('../controllers/note');
const rbacMiddleware = require('../middleware/checkPermission');

const express = require('express');

const router = express.Router();

router
  .route('/')
  .post(rbacMiddleware.checkPermission('NOTE', 'create_note'), SaveNote);
router
  .route('/:id')
  .get(rbacMiddleware.checkPermission('NOTE', 'get_note'), GetNote)
  .put(rbacMiddleware.checkPermission('NOTE', 'update_note'), UpdateNote);

router
  .route('/:noteId/:memberId')
  .delete(rbacMiddleware.checkPermission('NOTE', 'delete_note'), DeleteNote);

module.exports = router;
