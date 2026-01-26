const {
  CreateUser,
  UpdateUser,
  GetUser,
  DeleteUser,
  GetASingleMember,
  AddPermissionMember,
  GetProfileDetails,
  AddImageMember,
  FindMemberStat,
} = require('../controllers/members');
const rbacMiddleware = require('../middleware/checkPermission');

const express = require('express');

const router = express.Router();

/** POST Methods */
/**
 * @openapi
 * '/member':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Member Controller
 *     summary: Create member
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
 *              - category
 *              - dateofBirth
 *              - address
 *              - title
 *              - maritalStatus
 *              - spouseName
 *              - email
 *              - departments
 *              - membershipType
 *            properties:
 *              firstName:
 *                type: string
 *                default: Jane
 *              lastName:
 *                type: string
 *                default: Doe
 *              gender:
 *                type: String
 *                default: Female
 *              phone:
 *                type: string
 *              category:
 *                type: string
 *                default: Adult
 *              dateofBirth:
 *                type: string
 *                default: 07/07
 *              address:
 *                type: string
 *              membershipType:
 *                type: string
 *                default: Existing Member
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
 * '/member':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Member Controller
 *     summary: Get member
 *     parameters:
 *      - name: name
 *        in: path
 *        description: The name of the member
 *      - phone: phonenumber
 *        in: path
 *        description: The phone of the member
 *      - gender: gender
 *        in: path
 *        description: The gender of the member
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

/** GET Methods */
/**
 * @openapi
 * '/member/{id}':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Member Controller
 *     summary: Get a single member by Id
 *     parameters:
 *      - name: id
 *        in: path
 *        description: The unique Id of the member
 *        required: true
 *     responses:
 *      200:
 *        description: Ok
 *      400:
 *        description: Bad request
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */

/** PUT Methods */
/**
 * @openapi
 * '/member/{id}':
 *  put:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Member Controller
 *     summary: Modify a member
 *     parameters:
 *      - name: id
 *        in: path
 *        description: The unique Id of the user
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
 *              firstName:
 *                type: string
 *                default: ''
 *              lastName:
 *                type: string
 *                default: ''
 *              membershipType:
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

/** DELETE Methods */
/**
 * @openapi
 * '/member/{id}':
 *  delete:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Member Controller
 *     summary: Delete member by Id
 *     parameters:
 *      - name: id
 *        in: path
 *        description: The unique Id of the member
 *        required: true
 *     responses:
 *      200:
 *        description: Removed
 *      400:
 *        description: Bad request
 *      404:
 *        description: Not Found
 *      500:
 *        description: Server Error
 */

router
  .route('/')
  .post(rbacMiddleware.checkPermission('MEMBER', 'create_member'), CreateUser)
  .get(rbacMiddleware.checkPermission('MEMBER', 'read_member'), GetUser);

router
  .route('/:id')
  .put(rbacMiddleware.checkPermission('MEMBER', 'update_member'), UpdateUser)
  .delete(rbacMiddleware.checkPermission('MEMBER', 'delete_member'), DeleteUser)
  .get(
    rbacMiddleware.checkPermission('MEMBER', 'read_member'),
    GetASingleMember
  );
router
  .route('/permission/:id')
  .put(
    rbacMiddleware.checkPermission('SYSTEM', 'add_permission'),
    AddPermissionMember
  );
router
  .route('/details/:id')
  .get(
    rbacMiddleware.checkPermission('AUTH', 'get_profile') &&
      rbacMiddleware.checkPermission('AUTH', 'login'),
    GetProfileDetails
  );

router
  .route('/upload/image')
  .put(
    rbacMiddleware.checkPermission('MEMBER', 'update_member'),
    AddImageMember
  );
router.route('/stat/report').get(FindMemberStat);
module.exports = router;
