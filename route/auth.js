const {
  CreateAdmin,
  LoginAdmin,
  UpdatePassword,
  GetLoginUser,
  RemoveUserAuth,
} = require('../controllers/auth.js');
const rbacMiddleware = require('../middleware/checkPermission');

const express = require('express');
const auth = require('../middleware/authentication');

const router = express.Router();

/** POST Methods */
/**
 * @openapi
 * '/auth/register':
 *  post:
 *     tags:
 *     - Admin Controller
 *     summary: Create an admin
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - firstName
 *              - lastName
 *              - gender
 *              - phone
 *              - password
 *              - email
 *            properties:
 *              firstName:
 *                type: string
 *                default: john
 *              lastName:
 *                type: string
 *                default: doe
 *              gender:
 *                type: string
 *                default: ''
 *              email:
 *                type: string
 *                default: ''
 *              phone:
 *                type: string
 *                default: 09012345675
 *              password:
 *                type: string
 *                default: johnDoe20!@
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
 * '/auth/login':
 *  post:
 *     tags:
 *     - Admin Controller
 *     summary: Login
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *           schema:
 *            type: object
 *            required:
 *              - phone
 *              - password
 *            properties:
 *              phone:
 *                type: string
 *                default: 09012345675
 *              password:
 *                type: string
 *                default: johnDoe20!@
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

// /** GET Methods */
// /**
//  * @openapi
//  * '/single/{id}':
//  *  get:
//  *     security:
//  *     - bearerAuth: []
//  *     tags:
//  *     - Admin Controller
//  *     summary: Get single admin
//  *     parameters:
//  *      - id: id
//  *        in: path
//  *        description: The userId of admin
//  *     responses:
//  *      200:
//  *        description: Fetched Successfully
//  *      400:
//  *        description: Bad Request
//  *      404:
//  *        description: Not Found
//  *      500:
//  *        description: Server Error
//  */

/** PUT Methods */
// /**
//  * @openapi
//  * '/single/{id}':
//  *  put:
//  *     security:
//  *     - bearerAuth: []
//  *     tags:
//  *     - Admin Controller
//  *     summary: Modify an admin
//  *     parameters:
//  *      - name: id
//  *        in: path
//  *        description: The unique Id of the admin
//  *        required: true
//  *     requestBody:
//  *      required: true
//  *      content:
//  *        application/json:
//  *           schema:
//  *            type: object
//  *            required:
//  *              - _id
//  *            properties:
//  *              phone:
//  *                type: string
//  *                default: ''
//  *              email:
//  *                type: string
//  *                default: ''
//  *     responses:
//  *      200:
//  *        description: Modified
//  *      400:
//  *        description: Bad Request
//  *      404:
//  *        description: Not Found
//  *      500:
//  *        description: Server Error
//  */

router.post(
  '/register',
  auth,
  rbacMiddleware.checkPermission('AUTH', 'create_user'),
  CreateAdmin
);
router.post('/login', LoginAdmin);
// router.get('/single/:id', auth, GetSingleAdmin);
// router.put('/single/:id', auth, UpdateSingleAdmin);
router.put(
  '/single/password/:id',
  auth,
  rbacMiddleware.checkPermission('AUTH', 'update_password') &&
    rbacMiddleware.checkPermission('AUTH', 'get_profile') &&
    rbacMiddleware.checkPermission('AUTH', 'login'),
  UpdatePassword
);
router.get(
  '/users',
  auth,
  rbacMiddleware.checkPermission('AUTH', 'login') &&
    rbacMiddleware.checkPermission('AUTH', 'get_user'),
  GetLoginUser
);
router.delete(
  '/remove/:id/:permId',
  auth,
  rbacMiddleware.checkPermission('AUTH', 'login') &&
    rbacMiddleware.checkPermission('AUTH', 'get_user') &&
    rbacMiddleware.checkPermission('AUTH', 'create_user') &&
    rbacMiddleware.checkPermission('SYSTEM', 'add_permission') &&
    rbacMiddleware.checkPermission('SYSTEM', 'delete_permission'),
  RemoveUserAuth
);
module.exports = router;
