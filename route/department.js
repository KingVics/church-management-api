const {
  CreateDepartment,
  UpdateDepartment,
  GetDepartments,
  DeleteDepartment,
} = require('../controllers/department');
const rbacMiddleware = require('../middleware/checkPermission');

const express = require('express');

const router = express.Router();

/** POST Methods */
/**
 * @openapi
 * '/department':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Department Controller
 *     summary: Create Department
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - name
 *              - headOfDepartment
 *              - headOfDepartmentPhone
 *              - ministerInCharge
 *            properties:
 *              name:
 *                type: string
 *                default: ''
 *              headOfDepartment:
 *                type: string
 *                default: ''
 *              headOfDepartmentPhone:
 *                type: String
 *                default: ''
 *              ministerInCharge:
 *                type: string
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
 * '/department':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Department Controller
 *     summary: Get department
 *     parameters:
 *      - name: name
 *        in: path
 *        description: The name of the department
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

/** PUT Methods */
/**
 * @openapi
 * '/department/{id}':
 *  put:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Department Controller
 *     summary: Modify a department
 *     parameters:
 *      - Id: id
 *        in: path
 *        description: The unique Id of the department
 *        required: true
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - _id
 *            properties:
 *              name:
 *                type: string
 *                default: ''
 *              headOfDepartment:
 *                type: string
 *                default: ''
 *              headOfDepartmentPhone:
 *                type: string
 *                default: ''
 *              ministerInCharge:
 *                type: string
 *                default: ''
 *     responses:
 *      200:
 *        description: Modified
 *      400:
 *        description: Bad Request
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */

router
  .route('/')
  .post(
    rbacMiddleware.checkPermission('DEPARTMENT', 'create_department'),
    CreateDepartment
  )
  .get(
    rbacMiddleware.checkPermission('DEPARTMENT', 'read_department'),
    GetDepartments
  );

router
  .route('/:id')
  .put(
    rbacMiddleware.checkPermission('DEPARTMENT', 'update_department'),
    UpdateDepartment
  )
  .delete(
    rbacMiddleware.checkPermission('DEPARTMENT', 'delete_department'),
    DeleteDepartment
  );

module.exports = router;
