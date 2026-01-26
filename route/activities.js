const {
  CreateActivities,
  GetActivities,
  CaptureActivityforMember,
  GetCaptureActivity,
} = require('../controllers/activities');
const rbacMiddleware = require('../middleware/checkPermission');

const express = require('express');

const router = express.Router();

/** POST Methods */
/**
 * @openapi
 * '/activities':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Activity Controller
 *     summary: Create church activity
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - date
 *              - serviceName
 *            properties:
 *              date:
 *                type: string
 *                default: ''
 *              serviceName:
 *                type: string
 *                default: ''
 *     responses:
 *      201:
 *        description: Created
 *      409:
 *        description: Conflict
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */

/** GET Methods */
/**
 * @openapi
 * '/activities':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Activity Controller
 *     summary: Get activity
 *     parameters:
 *      - date: date
 *        in: path
 *        description: Date of the activity
 *      - serviceName: serviceName
 *        in: path
 *        description: The activity name
 *     responses:
 *      200:
 *        description: Fetched Successfully
 *      400:
 *        description: Bad Request
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */

/** POST Methods */
/**
 * @openapi
 * '/activities/auto':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Activity Controller
 *     summary: Auto create church activity
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - date
 *            properties:
 *              date:
 *                type: string
 *                default: '22-08-2024'
 *
 *     responses:
 *      201:
 *        description: Created
 *      409:
 *        description: Conflict
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */
router
  .route('/')
  .post(
    rbacMiddleware.checkPermission('ACTIVITY', 'create_activity'),
    CreateActivities
  )
  .get(
    rbacMiddleware.checkPermission('ACTIVITY', 'read_activity'),
    GetActivities
  );
router
  .route('/member')
  .post(
    rbacMiddleware.checkPermission('ACTIVITY', 'member_activity'),
    CaptureActivityforMember
  );
router
  .route('/auto')
  .post(
    rbacMiddleware.checkPermission('ACTIVITY', 'auto_activity'),
    GetCaptureActivity
  );
module.exports = router;
