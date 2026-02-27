const express = require('express');
const auth = require('../middleware/authentication');
const {
  startSession,
  getSessionQr,
  stopSession,
  restartSession,
  logoutSession,
  handleWebhook,
  testWebhook,
  testAbsentReminderWebhook,
  sendWelcome,
  sendSundayReminder,
  sendEventBroadcast,
  sendEmergencyBroadcast,
  sendCustomBroadcast,
  sendManualMessage,
  sendMessageToPhone,
  sendAbsentReminders,
  updateConsent,
  getBroadcastHistory,
  getBroadcastDetail,
  getMemberActivity,
  getMemberJourney,
  getAllJourneys,
  getOptedInCount,
  getSessionStatus,
  getWahaServerStatus,
  getSessionState,
  getInfrastructureStatus,
  startInfrastructure,
  stopInfrastructure,
  stopMemberJourney,
  stopJourneyById,
  stopActiveJourneys,
  getFollowUpFlow,
  updateFollowUpFlow,
  resetFollowUpFlow,
  bootstrapSession,
} = require('../controllers/whatsappController');

const router = express.Router();

/**
 * @openapi
 * '/whatsapp/webhook':
 *  post:
 *     tags:
 *     - WhatsApp
 *     summary: WAHA webhook receiver
 *     description: Receives incoming WAHA webhook events.
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *     responses:
 *      200:
 *        description: Webhook acknowledged
 */
router.post('/webhook', handleWebhook);

/**
 * @openapi
 * '/whatsapp/webhook/test':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Test webhook reply processing manually
 *     description: Simulates inbound WhatsApp replies without WAHA callback.
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              phone:
 *                type: string
 *                example: 2348156218098
 *              message:
 *                type: string
 *                example: "1"
 *              messages:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    phone:
 *                      type: string
 *                    message:
 *                      type: string
 *          example:
 *            messages:
 *              - phone: "2348156218098"
 *                message: "help"
 *              - phone: "2348156218098"
 *                message: "1"
 *     responses:
 *      200:
 *        description: Test webhook processed
 */
router.post('/webhook/test', auth, testWebhook);

/**
 * @openapi
 * '/whatsapp/webhook/test/absent-response':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Test absent-reminder reply mapping without prior send
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - message
 *            properties:
 *              memberId:
 *                type: string
 *              phone:
 *                type: string
 *              message:
 *                type: string
 *                example: "2"
 *              sendResponse:
 *                type: boolean
 *                description: If true, sends configured response through WAHA
 *          example:
 *            phone: "2348156218098"
 *            message: "2"
 *            sendResponse: false
 *     responses:
 *      200:
 *        description: Mapping result returned
 */
router.post('/webhook/test/absent-response', auth, testAbsentReminderWebhook);

/**
 * @openapi
 * '/whatsapp/session/start':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Create and start WAHA session
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              webhookUrl:
 *                type: string
 *                example: https://your-domain.com/api/v1/whatsapp/webhook
 *     responses:
 *      200:
 *        description: Session started
 */
router.post('/session/start', auth, startSession);

/**
 * @openapi
 * '/whatsapp/session/bootstrap':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Bootstrap WAHA worker/session and start default session
 *     description: Health-checks WAHA server, creates session if missing, and starts it.
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              webhookUrl:
 *                type: string
 *     responses:
 *      200:
 *        description: Session bootstrapped
 */
router.post('/session/bootstrap', auth, bootstrapSession);

/**
 * @openapi
 * '/whatsapp/session/qr':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Get WAHA session QR
 *     responses:
 *      200:
 *        description: QR payload
 */
router.get('/session/qr', auth, getSessionQr);

/**
 * @openapi
 * '/whatsapp/session/stop':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Stop WAHA session
 *     responses:
 *      200:
 *        description: Session stopped
 */
router.post('/session/stop', auth, stopSession);

/**
 * @openapi
 * '/whatsapp/session/restart':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Restart WAHA session
 *     responses:
 *      200:
 *        description: Session restarted
 */
router.post('/session/restart', auth, restartSession);

/**
 * @openapi
 * '/whatsapp/session/logout':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Logout WAHA session
 *     responses:
 *      200:
 *        description: Session logged out
 */
router.post('/session/logout', auth, logoutSession);

/**
 * @openapi
 * '/whatsapp/session/state':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Get normalized WAHA session state for UI controls
 *     responses:
 *      200:
 *        description: Session state with active/start/stop flags
 */
router.get('/session/state', auth, getSessionState);

/**
 * @openapi
 * '/whatsapp/server/status':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Get WAHA server/worker status
 *     responses:
 *      200:
 *        description: WAHA server status
 */
router.get('/server/status', auth, getWahaServerStatus);

/**
 * @openapi
 * '/whatsapp/infrastructure/status':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Infrastructure
 *     summary: Get WAHA container/worker infrastructure status
 *     parameters:
 *      - name: infraKeyEncrypted
 *        in: query
 *        required: false
 *        schema:
 *          type: string
 *      - name: infraKey
 *        in: query
 *        required: false
 *        schema:
 *          type: string
 *     responses:
 *      200:
 *        description: Infrastructure status
 */
router.get('/infrastructure/status', auth, getInfrastructureStatus);

/**
 * @openapi
 * '/whatsapp/infrastructure/start':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Infrastructure
 *     summary: Start/recreate WAHA infrastructure via server-side command
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              infraKeyEncrypted:
 *                type: string
 *              infraKey:
 *                type: string
 *              bootstrapSession:
 *                type: boolean
 *              webhookUrl:
 *                type: string
 *     responses:
 *      200:
 *        description: Infrastructure start command executed
 */
router.post('/infrastructure/start', auth, startInfrastructure);

/**
 * @openapi
 * '/whatsapp/infrastructure/stop':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - Infrastructure
 *     summary: Stop WAHA infrastructure via server-side command
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              infraKeyEncrypted:
 *                type: string
 *              infraKey:
 *                type: string
 *              logoutSessionFirst:
 *                type: boolean
 *     responses:
 *      200:
 *        description: Infrastructure stop command executed
 */
router.post('/infrastructure/stop', auth, stopInfrastructure);

/**
 * @openapi
 * '/whatsapp/session-status':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Get WAHA session status
 *     responses:
 *      200:
 *        description: Session status
 */
router.get('/session-status', auth, getSessionStatus);

/**
 * @openapi
 * '/whatsapp/welcome/{memberId}':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Send first-timer welcome manually
 *     parameters:
 *      - name: memberId
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *     responses:
 *      200:
 *        description: Welcome sent
 */
router.post('/welcome/:memberId', auth, sendWelcome);

/**
 * @openapi
 * '/whatsapp/broadcast/sunday-reminder':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Broadcast Sunday reminder
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              serviceTime:
 *                type: string
 *                example: 9:00 AM
 *     responses:
 *      200:
 *        description: Broadcast queued
 */
router.post('/broadcast/sunday-reminder', auth, sendSundayReminder);

/**
 * @openapi
 * '/whatsapp/broadcast/event':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Broadcast event update
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - name
 *              - date
 *              - time
 *            properties:
 *              name:
 *                type: string
 *              date:
 *                type: string
 *              time:
 *                type: string
 *              venue:
 *                type: string
 *     responses:
 *      200:
 *        description: Broadcast queued
 */
router.post('/broadcast/event', auth, sendEventBroadcast);

/**
 * @openapi
 * '/whatsapp/broadcast/emergency':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Broadcast emergency message
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - message
 *            properties:
 *              message:
 *                type: string
 *     responses:
 *      200:
 *        description: Broadcast queued
 */
router.post('/broadcast/emergency', auth, sendEmergencyBroadcast);

/**
 * @openapi
 * '/whatsapp/broadcast/custom':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Broadcast custom message
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - message
 *            properties:
 *              message:
 *                type: string
 *              memberIds:
 *                type: array
 *                items:
 *                  type: string
 *              departmentId:
 *                type: string
 *     responses:
 *      200:
 *        description: Broadcast queued
 */
router.post('/broadcast/custom', auth, sendCustomBroadcast);

/**
 * @openapi
 * '/whatsapp/send/{memberId}':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Send manual WhatsApp message to a member
 *     parameters:
 *      - name: memberId
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - message
 *            properties:
 *              message:
 *                type: string
 *     responses:
 *      200:
 *        description: Message sent
 */
router.post('/send/:memberId', auth, sendManualMessage);

/**
 * @openapi
 * '/whatsapp/send-phone':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Send manual WhatsApp message to a phone number
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - phone
 *              - message
 *            properties:
 *              phone:
 *                type: string
 *                example: 2348012345678
 *              message:
 *                type: string
 *     responses:
 *      200:
 *        description: Message sent
 */
router.post('/send-phone', auth, sendMessageToPhone);

/**
 * @openapi
 * '/whatsapp/send-absent-reminders':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Send absent reminders to selected members
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - memberIds
 *            properties:
 *              memberIds:
 *                type: array
 *                items:
 *                  type: string
 *              weeksMissed:
 *                type: number
 *     responses:
 *      200:
 *        description: Reminders processed
 */
router.post('/send-absent-reminders', auth, sendAbsentReminders);

/**
 * @openapi
 * '/whatsapp/consent/{memberId}':
 *  patch:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Update WhatsApp consent for member
 *     parameters:
 *      - name: memberId
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - optIn
 *            properties:
 *              optIn:
 *                type: boolean
 *     responses:
 *      200:
 *        description: Consent updated
 */
router.patch('/consent/:memberId', auth, updateConsent);

/**
 * @openapi
 * '/whatsapp/broadcast-history':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: List broadcast history
 *     parameters:
 *      - name: page
 *        in: query
 *        schema:
 *          type: number
 *      - name: limit
 *        in: query
 *        schema:
 *          type: number
 *      - name: type
 *        in: query
 *        schema:
 *          type: string
 *      - name: status
 *        in: query
 *        schema:
 *          type: string
 *     responses:
 *      200:
 *        description: Broadcast history
 */
router.get('/broadcast-history', auth, getBroadcastHistory);

/**
 * @openapi
 * '/whatsapp/broadcast-history/{broadcastId}':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Get broadcast detail
 *     parameters:
 *      - name: broadcastId
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *     responses:
 *      200:
 *        description: Broadcast detail
 */
router.get('/broadcast-history/:broadcastId', auth, getBroadcastDetail);

/**
 * @openapi
 * '/whatsapp/activity/{memberId}':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Get member WhatsApp activity
 *     parameters:
 *      - name: memberId
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *     responses:
 *      200:
 *        description: Member activity
 */
router.get('/activity/:memberId', auth, getMemberActivity);

/**
 * @openapi
 * '/whatsapp/journey/{memberId}':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Get member follow-up journey
 *     parameters:
 *      - name: memberId
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *     responses:
 *      200:
 *        description: Journey detail
 */
router.get('/journey/:memberId', auth, getMemberJourney);

/**
 * @openapi
 * '/whatsapp/journey/{memberId}/stop':
 *  patch:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Stop active follow-up journey by member ID
 *     parameters:
 *      - name: memberId
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              reason:
 *                type: string
 *     responses:
 *      200:
 *        description: Journey stopped
 */
router.patch('/journey/:memberId/stop', auth, stopMemberJourney);

/**
 * @openapi
 * '/whatsapp/journeys/{journeyId}/stop':
 *  patch:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Stop active follow-up journey by journey ID
 *     parameters:
 *      - name: journeyId
 *        in: path
 *        required: true
 *        schema:
 *          type: string
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              reason:
 *                type: string
 *     responses:
 *      200:
 *        description: Journey stopped
 */
router.patch('/journeys/:journeyId/stop', auth, stopJourneyById);

/**
 * @openapi
 * '/whatsapp/journeys':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: List follow-up journeys
 *     parameters:
 *      - name: status
 *        in: query
 *        schema:
 *          type: string
 *      - name: page
 *        in: query
 *        schema:
 *          type: number
 *      - name: limit
 *        in: query
 *        schema:
 *          type: number
 *     responses:
 *      200:
 *        description: Journeys list
 */
router.get('/journeys', auth, getAllJourneys);

/**
 * @openapi
 * '/whatsapp/opted-in/count':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Get total number of WhatsApp opted-in users
 *     responses:
 *      200:
 *        description: Opted-in user totals
 */
router.get('/opted-in/count', auth, getOptedInCount);

/**
 * @openapi
 * '/whatsapp/journeys/stop-active':
 *  patch:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Stop all active follow-up journeys (or selected members)
 *     requestBody:
 *      required: false
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              memberIds:
 *                type: array
 *                items:
 *                  type: string
 *              reason:
 *                type: string
 *     responses:
 *      200:
 *        description: Active journeys stopped
 */
router.patch('/journeys/stop-active', auth, stopActiveJourneys);

/**
 * @openapi
 * '/whatsapp/flow':
 *  get:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Get follow-up and absent reminder templates
 *     responses:
 *      200:
 *        description: Follow-up and absent reminder templates with defaults
 */
router.get('/flow', auth, getFollowUpFlow);

/**
 * @openapi
 * '/whatsapp/flow':
 *  put:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Create/update follow-up or absent reminder template
 *     description: Use configType "follow_up" with stages, or "absent_reminder" with absentReminder. Provide templateId to update an existing template.
 *     requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - configType
 *            properties:
 *              configType:
 *                type: string
 *                enum: [follow_up, absent_reminder]
 *              templateId:
 *                type: string
 *                description: Existing template ID to update
 *              isDefault:
 *                type: boolean
 *                description: If true, sets this template as the default for its configType
 *              isActive:
 *                type: boolean
 *              name:
 *                type: string
 *              stages:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    stage:
 *                      type: number
 *                      description: Unique stage number (e.g. 0, 2, 4, 7, 10, 14)
 *                    key:
 *                      type: string
 *                      description: Unique stage key label (e.g. welcome, day2, day4, day7, day10)
 *                    enabled:
 *                      type: boolean
 *                    message:
 *                      type: string
 *                    delayToNextDays:
 *                      type: number
 *                      nullable: true
 *                    sendHour:
 *                      type: number
 *                    sendMinute:
 *                      type: number
 *                    responseOptions:
 *                      type: array
 *                      items:
 *                        type: object
 *                        properties:
 *                          code:
 *                            type: string
 *                            description: Reply token, e.g. "1", "yes", "amen"
 *                          matches:
 *                            type: array
 *                            items:
 *                              type: string
 *                            description: Additional equivalent reply phrases
 *                          responseMessage:
 *                            type: string
 *                            description: Message to send when this option is selected
 *                          conversationStage:
 *                            type: string
 *                          journeyStatus:
 *                            type: string
 *                            enum: [active, completed, paused, escalated, opted_out]
 *                          escalationNotes:
 *                            type: string
 *                          nextStageOverride:
 *                            type: number
 *              absentReminder:
 *                type: object
 *                properties:
 *                  enabled:
 *                    type: boolean
 *                  messageTemplate:
 *                    type: string
 *                    description: Template for absent reminder text
 *                  responseOptions:
 *                    type: array
 *                    items:
 *                      type: object
 *                      properties:
 *                        code:
 *                          type: string
 *                        matches:
 *                          type: array
 *                          items:
 *                            type: string
 *                        responseMessage:
 *                          type: string
 *                        conversationStage:
 *                          type: string
 *                        journeyStatus:
 *                          type: string
 *                        escalationNotes:
 *                          type: string
 *                        nextStageOverride:
 *                          type: number
 *          example:
 *            configType: follow_up
 *            isDefault: true
 *            name: Visitor Follow-up Flow Extended
 *            stages:
 *              - stage: 0
 *                key: welcome
 *                enabled: true
 *                message: "Hello {{firstName}}. Welcome to {{churchName}}! We are glad you worshipped with us. Reply 1 for prayer, 2 for small groups, 3 for membership info."
 *                delayToNextDays: 2
 *                sendHour: 10
 *                sendMinute: 0
 *                responseOptions:
 *                  - code: "1"
 *                    matches: ["prayer", "pray", "yes prayer"]
 *                    responseMessage: "Thank you {{firstName}}. Please share your prayer request."
 *                    conversationStage: "prayer_requested"
 *                  - code: "2"
 *                    matches: ["group", "small group"]
 *                    responseMessage: "Great {{firstName}}. We will connect you to a small group."
 *                    conversationStage: "smallgroup_interested"
 *                  - code: "3"
 *                    matches: ["membership", "member info"]
 *                    responseMessage: "We are excited about your interest in membership."
 *                    conversationStage: "membership_interested"
 *              - stage: 2
 *                key: day2
 *                enabled: true
 *                message: "Hi {{firstName}}, we are checking in. Is there anything you would like us to pray about?"
 *                delayToNextDays: 2
 *                sendHour: 10
 *                sendMinute: 0
 *              - stage: 4
 *                key: day4
 *                enabled: true
 *                message: "Hi {{firstName}}, would you like to join a small group this week? Reply 1 for yes, 2 for later, 3 for more info."
 *                delayToNextDays: 3
 *                sendHour: 10
 *                sendMinute: 0
 *              - stage: 7
 *                key: day7
 *                enabled: true
 *                message: "Hi {{firstName}}, our team would love to connect with you personally. Reply 1 for a call, 2 for not now."
 *                delayToNextDays: 3
 *                sendHour: 10
 *                sendMinute: 0
 *                responseOptions:
 *                  - code: "1"
 *                    matches: ["yes", "call me"]
 *                    responseMessage: "Wonderful {{firstName}}. A team member will contact you."
 *                    journeyStatus: "escalated"
 *                    escalationNotes: "Member requested personal call."
 *                  - code: "2"
 *                    matches: ["not now", "later"]
 *                    responseMessage: "No problem {{firstName}}. We are here whenever you are ready."
 *                    journeyStatus: "completed"
 *              - stage: 10
 *                key: day10
 *                enabled: true
 *                message: "Hi {{firstName}}, this is our day 10 check-in from {{churchName}}. We are here for you."
 *                delayToNextDays: null
 *                sendHour: 10
 *                sendMinute: 0
 *     responses:
 *      200:
 *        description: Template saved
 */
router.put('/flow', auth, updateFollowUpFlow);

/**
 * @openapi
 * '/whatsapp/flow/reset':
 *  post:
 *     security:
 *     - bearerAuth: []
 *     tags:
 *     - WhatsApp
 *     summary: Reset follow-up flow to default templates and schedule
 *     responses:
 *      200:
 *        description: Flow reset
 */
router.post('/flow/reset', auth, resetFollowUpFlow);

module.exports = router;
