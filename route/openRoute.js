const { CreateUser } = require('../controllers/members');
const { GetDepartments } = require('../controllers/department');
const {
  FetchPastLiveStreams,
  GetScheduledStreams,
  GetStreamUrl,
} = require('../controllers/stream');
const express = require('express');

const router = express.Router();

/** GET Methods */
/**
 * @openapi
 * '/open/pastlivestreams':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Youtube Streams
 *     summary: Get Live Past Streams Videos
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
 * '/open/livestreams':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Youtube Streams
 *     summary: Get Scheduled Live Streams Videos
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
 * '/open/live':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Youtube Streams
 *     summary: Watch Live Stream
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

router.route('/createuser').post(CreateUser);
router.route('/department').get(GetDepartments);
router.route('/pastlivestreams').get(FetchPastLiveStreams);
router.route('/livestreams').get(GetScheduledStreams);
router.route('/live').get(GetStreamUrl);

module.exports = router;
