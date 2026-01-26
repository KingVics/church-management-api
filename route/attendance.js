const {
  CaptureAttendance,
  GenerateTotalAttendance,
  CaptureAutoAttendance,
  GetTotalAttendance,
} = require('../controllers/attendance');
const rbacMiddleware = require('../middleware/checkPermission');

const express = require('express');

const router = express.Router();

/** POST Methods */
/**
 * @openapi
 * '/attendance':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Attendance Controller
 *     summary: Create attendance
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - activityId
 *              - memberName
 *              - memberPhone
 *            properties:
 *              activityId:
 *                type: string
 *                default: ''
 *              memberName:
 *                type: string
 *                default: ''
 *              memberPhone:
 *                type: String
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

/** POST Methods */
/**
 * @openapi
 * '/attendance/total':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Attendance Controller
 *     summary: Generate attendance
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - activityId
 *              - type
 *            properties:
 *              activityId:
 *                type: string
 *                default: ''
 *              type:
 *                type: string
 *                default: 'Present/Absent'
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

/** POST Methods */
/**
 * @openapi
 * '/attendance/auto':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Attendance Controller
 *     summary: Create attendance
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - activityId
 *              - memberId
 *            properties:
 *              activityId:
 *                type: string
 *                default: ''
 *              memberId:
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
router
  .route('/')
  .post(
    rbacMiddleware.checkPermission('ATTENDANCE', 'create_attendance'),
    CaptureAttendance
  );
router
  .route('/total')
  .post(
    rbacMiddleware.checkPermission('ATTENDANCE', 'generate_attendance'),
    GenerateTotalAttendance
  );
router
  .route('/auto')
  .post(
    rbacMiddleware.checkPermission('ATTENDANCE', 'capture_attendance'),
    CaptureAutoAttendance
  );

router
  .route('/report/:id/:type')
  .get(
    rbacMiddleware.checkPermission('ATTENDANCE', 'read_report'),
    GetTotalAttendance
  );

router
  .route('/list/:id')
  .get(
    rbacMiddleware.checkPermission('SYSTEM', 'call_report'),
    GetTotalAttendance
  );

module.exports = router;
