const { SendMessage } = require('../controllers/sendMessage');
const express = require('express');

const router = express.Router();

/** POST Methods */
/**
 * @openapi
 * '/notification/send':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Notification
 *     summary: Send Notification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *            schema:
 *             type: object
 *             required:
 *               - title
 *               - body
 *             properties:
 *               title:
 *                 type: string
 *                 default: ''
 *               body:
 *                 type: string
 *                 default: ''
 *
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

router.route('/send').post(SendMessage);

module.exports = router;
