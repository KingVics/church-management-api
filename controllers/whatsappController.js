const MembersModel = require('../model/members');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const followUpService = require('../services/followUpService');
const broadcastService = require('../services/broadcastService');
const wahaService = require('../services/wahaService');
const WhatsappActivity = require('../model/WhatsappActivity');
const FollowUpJourney = require('../model/FollowUpJourney');
const FollowUpFlowConfig = require('../model/FollowUpFlowConfig');
const infrastructureService = require('../services/infrastructureService');

const ACTIVE_SESSION_STATUSES = [
  'WORKING',
  'CONNECTED',
  'RUNNING',
  'STARTED',
  'READY',
];

const STARTING_SESSION_STATUSES = ['STARTING', 'INITIALIZING'];
const STOPPING_SESSION_STATUSES = ['STOPPING'];
const STOPPED_SESSION_STATUSES = ['STOPPED', 'FAILED', 'LOGGED_OUT', 'DISCONNECTED'];
const QR_SESSION_STATUSES = ['SCAN_QR_CODE', 'WAITING_FOR_QR', 'PAIRING', 'AUTH'];

const toUpper = (value) => String(value || '').toUpperCase();
const getWahaErrorStatusCode = (error) =>
  error?.code === 'SESSION_NOT_ACTIVE' ? 409 : 400;

const normalizeSessionState = (raw) => {
  const status =
    toUpper(raw?.status) ||
    toUpper(raw?.state) ||
    toUpper(raw?.session?.status) ||
    'UNKNOWN';

  const isActive = ACTIVE_SESSION_STATUSES.includes(status);
  const isStarting = STARTING_SESSION_STATUSES.includes(status);
  const isStopping = STOPPING_SESSION_STATUSES.includes(status);
  const isStopped = STOPPED_SESSION_STATUSES.includes(status);
  const needsQr =
    QR_SESSION_STATUSES.includes(status) ||
    String(raw?.message || '').toUpperCase().includes('QR');

  return {
    sessionName: process.env.WAHA_SESSION || 'default',
    status,
    isActive,
    isStarting,
    isStopping,
    isStopped,
    needsQr,
    canStart: !isActive && !isStarting,
    canStop: isActive || isStarting,
    canRestart: !isStopping,
    canLogout: isActive || isStarting || needsQr,
    raw,
  };
};

const normalizeWebhookMessage = (msg = {}) => {
  const fromRaw =
    msg.from ||
    msg.fromNumber ||
    msg.author ||
    msg.chatId ||
    msg.chat?.id ||
    '';
  const from = String(fromRaw).replace('@c.us', '').replace('@s.whatsapp.net', '');
  const body =
    msg.body ||
    msg.text ||
    msg.message ||
    msg.caption ||
    msg.content ||
    '';

  const fromMe = Boolean(msg.fromMe || msg?.id?.fromMe || msg?.ack?.fromMe);
  return { from, body: String(body || '').trim(), fromMe };
};

// const extractWebhookMessages = (body = {}) => {
//   const event = body?.event || body?.type || '';
//   const payload = body?.payload ?? body?.data ?? body;

//   if (String(event).startsWith('message.ack')) return [];

//   const candidates = [];
//   if (Array.isArray(payload?.messages)) candidates.push(...payload.messages);
//   if (Array.isArray(payload)) candidates.push(...payload);
//   if (payload?.message) candidates.push(payload.message);
//   if (payload?.body || payload?.text || payload?.from || payload?.fromNumber) {
//     candidates.push(payload);
//   }
//   if (body?.message) candidates.push(body.message);
//   if (body?.body || body?.text || body?.from || body?.fromNumber) candidates.push(body);

//   const unique = new Set();
//   const normalized = [];
//   for (const c of candidates) {
//     const msg = normalizeWebhookMessage(c);
//     const key = `${msg.from}|${msg.body}|${msg.fromMe}`;
//     if (!msg.from || !msg.body || msg.fromMe) continue;
//     if (unique.has(key)) continue;
//     unique.add(key);
//     normalized.push(msg);
//   }
//   return normalized;
// };


const extractWebhookMessages = (body = {}) => {
  if (body?.event !== 'message') return [];

  const payload = body.payload;
  if (!payload) return [];

  // Ignore messages sent by the bot
  if (payload.fromMe) return [];

  // Ignore group messages
  if (!payload.from?.endsWith('@c.us')) return [];

  // Ignore empty/system messages
  if (!payload.body || payload.body.trim() === '') return [];

  return [
    {
      from: payload.from,
      body: payload.body.trim(),
      fromMe: false,
    },
  ];
};
const startSession = async (req, res) => {
  try {
    const webhookUrl = req.body?.webhookUrl || process.env.WEBHOOK_BASE_URL || null;
    const startResult = await wahaService.bootstrapDefaultSession({
      webhookUrl,
      sessionName: process.env.WAHA_SESSION || 'default',
    });
    if (!startResult.success) {
      const code = startResult.error?.code;
      const statusCode = code === 'WAHA_UNAVAILABLE' ? 503 : 400;
      return res.status(statusCode).json({ error: startResult.error });
    }

    const session = await wahaService.getSessionStatus();
    return res.status(200).json({
      message: 'WAHA session started',
      session: normalizeSessionState(session),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const bootstrapSession = async (req, res) => {
  try {
    const webhookUrl = req.body?.webhookUrl || process.env.WEBHOOK_BASE_URL || null;
    const result = await wahaService.bootstrapDefaultSession({
      webhookUrl,
      sessionName: process.env.WAHA_SESSION || 'default',
    });
    if (!result.success) {
      const code = result.error?.code;
      const statusCode = code === 'WAHA_UNAVAILABLE' ? 503 : 400;
      return res.status(statusCode).json({ error: result.error });
    }

    return res.status(200).json({
      message: 'WAHA worker/session bootstrap completed',
      session: normalizeSessionState(result.data?.session || null),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getSessionQr = async (req, res) => {
  try {
    const qr = await wahaService.getQr();
    if (!qr.success) {
      return res.status(400).json({ error: qr.error });
    }
    return res.status(200).json(qr.data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const stopSession = async (req, res) => {
  try {
    const result = await wahaService.stopSession();
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const session = await wahaService.getSessionStatus();
    return res.status(200).json({
      message: 'WAHA session stop requested',
      action: result.data,
      session: normalizeSessionState(session),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const restartSession = async (req, res) => {
  try {
    const result = await wahaService.restartSession();
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const session = await wahaService.getSessionStatus();
    return res.status(200).json({
      message: 'WAHA session restart requested',
      action: result.data,
      session: normalizeSessionState(session),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const logoutSession = async (req, res) => {
  try {
    const result = await wahaService.logoutSession();
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const session = await wahaService.getSessionStatus();
    return res.status(200).json({
      message: 'WAHA session logout requested',
      action: result.data,
      session: normalizeSessionState(session),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const handleWebhook = async (req, res) => {
  try {
    console.log("[Webhook] Received payload:", JSON.stringify(req.body));
    const messages = extractWebhookMessages(req.body || {});
    const results = [];

    console.log(`[Webhook] Extracted ${messages.length} message(s) from payload.`);

    for (const msg of messages) {
      const result = await followUpService.handleReply(msg.from, msg.body);

      console.log(result, 'result from handleReply');
      results.push({
        from: msg.from,
        action: result?.action || 'ignored',
      });
    }

    return res.status(200).json({
      received: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('[Webhook] Error:', error.message);
    return res.status(200).json({ received: true, error: error.message });
  }
};

const testWebhook = async (req, res) => {
  try {
    const { phone, message, messages } = req.body || {};
    const testMessages =
      Array.isArray(messages) && messages.length > 0
        ? messages
        : [{ phone, message }];

    const normalized = testMessages
      .map((m) => ({
        from: String(m?.phone || '').trim(),
        body: String(m?.message || '').trim(),
      }))
      .filter((m) => m.from && m.body);

    if (normalized.length === 0) {
      return res.status(400).json({
        error:
          'Provide phone/message or messages:[{phone,message}] with at least one valid entry',
      });
    }

    const results = [];
    for (const msg of normalized) {
      const result = await followUpService.handleReply(msg.from, msg.body);
      results.push({
        from: msg.from,
        body: msg.body,
        action: result?.action || 'ignored',
      });
    }

    return res.status(200).json({
      received: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const testAbsentReminderWebhook = async (req, res) => {
  try {
    const { phone, message, memberId, sendResponse = false } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    if (!phone && !memberId) {
      return res
        .status(400)
        .json({ error: 'phone or memberId is required' });
    }

    const result = await followUpService.testAbsentReminderReply({
      phone,
      message,
      memberId,
      sendResponse: !!sendResponse,
    });

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const sendWelcome = async (req, res) => {
  try {
    const member = await MembersModel.findById(req.params.memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    if (!member.phone) {
      return res.status(400).json({ error: 'Member has no phone number' });
    }

    const journey = await followUpService.startJourney(member);
    member.firstTimer = true;
    member.followUpStage = journey?.currentStage ?? 0;
    member.whatsappConversationStage =
      (journey?.currentStage ?? 0) > 0 ? 'awaiting_reply' : 'welcome_sent';
    if (!member.followUpStartDate) {
      member.followUpStartDate = journey?.startedAt || new Date();
    }

    await member.save();

    return res.status(200).json({
      message: 'Follow-up journey started or resumed',
      journeyId: journey._id,
      currentStage: journey.currentStage,
      status: journey.status,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const sendSundayReminder = async (req, res) => {
  try {
    const members = await MembersModel.find({
      whatsappOptIn: true,
      phone: { $exists: true, $ne: '' },
    });
    const result = await broadcastService.sendSundayReminder(
      members,
      req.user.userId,
      req.body?.serviceTime || process.env.SERVICE_TIME || '9:00 AM'
    );
    if (result?.success === false && result?.error) {
      return res
        .status(getWahaErrorStatusCode(result.error))
        .json({ error: result.error });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const sendEventBroadcast = async (req, res) => {
  try {
    const { name, date, time, venue } = req.body;
    if (!name || !date || !time) {
      return res.status(400).json({ error: 'name, date, and time are required' });
    }

    const members = await MembersModel.find({
      whatsappOptIn: true,
      phone: { $exists: true, $ne: '' },
    });
    const result = await broadcastService.sendEventUpdate(members, req.user.userId, {
      name,
      date,
      time,
      venue,
    });
    if (result?.success === false && result?.error) {
      return res
        .status(getWahaErrorStatusCode(result.error))
        .json({ error: result.error });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const sendEmergencyBroadcast = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const members = await MembersModel.find({
      whatsappOptIn: true,
      phone: { $exists: true, $ne: '' },
    });
    const result = await broadcastService.sendEmergencyAnnouncement(
      members,
      req.user.userId,
      message
    );
    if (result?.success === false && result?.error) {
      return res
        .status(getWahaErrorStatusCode(result.error))
        .json({ error: result.error });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const sendCustomBroadcast = async (req, res) => {
  try {
    const { message, memberIds, departmentId } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const query = {
      whatsappOptIn: true,
      phone: { $exists: true, $ne: '' },
    };
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      query._id = { $in: memberIds };
    }
    if (departmentId) {
      query.departments = { $elemMatch: { deptId: departmentId } };
    }

    const members = await MembersModel.find(query);
    const result = await broadcastService.sendToGroup(
      members,
      message,
      req.user.userId
    );
    if (result?.success === false && result?.error) {
      return res
        .status(getWahaErrorStatusCode(result.error))
        .json({ error: result.error });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const sendManualMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const member = await MembersModel.findById(req.params.memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const result = await broadcastService.sendManualMessage(
      member,
      message,
      req.user.userId
    );
    if (!result.success) {
      return res
        .status(getWahaErrorStatusCode(result.error))
        .json({ error: result.error });
    }
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const sendMessageToPhone = async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'phone is required' });
    }
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const result = await wahaService.sendText(phone, message);
    if (!result.success) {
      return res
        .status(getWahaErrorStatusCode(result.error))
        .json({ error: result.error });
    }

    const cleanedPhone = String(phone).replace(/\D/g, '');
    const member = await MembersModel.findOne({
      phone: { $regex: cleanedPhone },
    });

    if (member?._id) {
      await WhatsappActivity.create({
        memberId: member._id,
        phone: member.phone || cleanedPhone,
        direction: 'outbound',
        messageType: 'manual',
        content: message,
        status: 'sent',
        sentBy: req.user.userId,
        wahaMessageId: result.data?.messageId || null,
      });

      await MembersModel.findByIdAndUpdate(member._id, {
        $set: { lastWhatsappMessageSent: new Date() },
        $inc: { totalMessagesSent: 1 },
      });
    }

    return res.status(200).json({
      success: true,
      sentTo: cleanedPhone,
      linkedMemberId: member?._id || null,
      result: result.data,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const sendAbsentReminders = async (req, res) => {
  try {
    const { memberIds, weeksMissed } = req.body;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'memberIds array is required' });
    }

    const members = await MembersModel.find({ _id: { $in: memberIds } });
    const results = await broadcastService.sendAbsentReminders(
      members,
      req.user.userId,
      weeksMissed || 1
    );
    return res.status(200).json({ message: 'Absent reminders sent', results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateConsent = async (req, res) => {
  try {
    const { optIn } = req.body;
    const member = await MembersModel.findById(req.params.memberId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    member.whatsappOptIn = !!optIn;
    if (member.whatsappOptIn) {
      member.whatsappOptInDate = new Date();
      member.whatsappOptOutDate = null;
    } else {
      member.whatsappOptOutDate = new Date();
      await FollowUpJourney.findOneAndUpdate(
        { memberId: member._id, status: 'active' },
        { status: 'opted_out' }
      );
    }
    await member.save();

    return res.status(200).json({
      message: `WhatsApp ${member.whatsappOptIn ? 'opt-in' : 'opt-out'} updated`,
      whatsappOptIn: member.whatsappOptIn,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getBroadcastHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const result = await broadcastService.getBroadcastHistory(
      parseInt(page, 10),
      parseInt(limit, 10),
      { type, status }
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getBroadcastDetail = async (req, res) => {
  try {
    const broadcast = await broadcastService.getBroadcastDetail(
      req.params.broadcastId
    );
    if (!broadcast) {
      return res.status(404).json({ error: 'Broadcast not found' });
    }
    return res.status(200).json(broadcast);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getMemberActivity = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const memberId = req.params.memberId;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    const total = await WhatsappActivity.countDocuments({ memberId });
    const activities = await WhatsappActivity.find({ memberId })
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return res.status(200).json({
      activities,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getMemberJourney = async (req, res) => {
  try {
    const journey = await FollowUpJourney.findOne({
      memberId: req.params.memberId,
    })
      .populate('memberId', 'firstName lastName phone')
      .populate('assignedTo', 'firstName lastName');

    if (!journey) {
      return res
        .status(404)
        .json({ error: 'No follow-up journey found for this member' });
    }
    return res.status(200).json(journey);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getAllJourneys = async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 50 } = req.query;
    const query = {};
    if (status !== 'all') query.status = status;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    const total = await FollowUpJourney.countDocuments(query);
    const journeys = await FollowUpJourney.find(query)
      .populate('memberId', 'firstName lastName phone')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit);

    return res.status(200).json({
      journeys,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getOptedInCount = async (req, res) => {
  try {
    const totalOptedIn = await MembersModel.countDocuments({
      whatsappOptIn: true,
    });

    const optedInWithPhone = await MembersModel.countDocuments({
      whatsappOptIn: true,
      phone: { $exists: true, $ne: '' },
    });

    const optedInNoPhone = totalOptedIn - optedInWithPhone;

    return res.status(200).json({
      totalOptedIn,
      optedInWithPhone,
      optedInNoPhone,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getSessionStatus = async (req, res) => {
  try {
    const raw = await wahaService.getSessionStatus();
    return res.status(200).json({ session: normalizeSessionState(raw) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getWahaServerStatus = async (req, res) => {
  try {
    const status = await wahaService.getServerStatus();
    if (!status.success) {
      return res.status(503).json({ error: status.error });
    }
    return res.status(200).json(status.data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const decryptInfraKey = (encryptedValue) => {
  if (!encryptedValue) return '';
  const secret = process.env.INFRA_KEY_ENCRYPTION_SECRET || '';
  if (!secret) return '';
  try {
    const [ivHex, cipherHex] = String(encryptedValue).split(':');
    if (!ivHex || !cipherHex) return '';
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(cipherHex, 'hex');
    const key = crypto.createHash('sha256').update(secret).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]).toString('utf8');
    return decrypted;
  } catch (error) {
    return '';
  }
};

const getInfraTokenSecret = () =>
  process.env.INFRA_TOKEN_SECRET ||
  process.env.INFRA_KEY_ENCRYPTION_SECRET ||
  process.env.JWT_SECRET;

const verifyInfraToken = (token) => {
  const secret = getInfraTokenSecret();
  if (!secret || !token) return null;
  try {
    const decoded = jwt.verify(String(token), secret);
    if (decoded?.scope !== 'infra') return null;
    return decoded;
  } catch (error) {
    return null;
  }
};

const extractInfraKey = (req) => {
  const plain =
    req.body?.infraKey ||
    req.query?.infraKey ||
    '';
  if (plain) return String(plain);

  const encrypted =
    req.body?.infraKeyEncrypted ||
    req.query?.infraKeyEncrypted ||
    '';
  if (encrypted) return decryptInfraKey(encrypted);

  // Backward compatibility only.
  const headerKey = req.headers['x-infra-key'] || '';
  if (headerKey) return String(headerKey);
  return '';
};

const validateInfraKey = (req) => {
  const infraToken =
    req.body?.infraToken || req.query?.infraToken || req.headers['x-infra-token'];
  const tokenPayload = verifyInfraToken(infraToken);
  if (tokenPayload) {
    return { ok: true, via: 'token', tokenPayload };
  }

  const requiredKey = process.env.INFRA_ADMIN_KEY;
  if (!requiredKey) {
    return {
      ok: false,
      code: 503,
      message: 'INFRA_ADMIN_KEY is not configured on server',
    };
  }

  const key = extractInfraKey(req);
  if (!key || key !== requiredKey) {
    return {
      ok: false,
      code: 403,
      message: 'Invalid infrastructure key. Send infraKey or infraKeyEncrypted.',
    };
  }

  return { ok: true };
};

const generateInfrastructureToken = async (req, res) => {
  try {
    const requiredKey = process.env.INFRA_ADMIN_KEY;
    if (!requiredKey) {
      return res
        .status(503)
        .json({ error: 'INFRA_ADMIN_KEY is not configured on server' });
    }

    const providedKey = extractInfraKey(req);
    if (!providedKey || providedKey !== requiredKey) {
      return res
        .status(403)
        .json({ error: 'Invalid infrastructure key. Cannot issue token.' });
    }

    const secret = getInfraTokenSecret();
    if (!secret) {
      return res.status(503).json({
        error:
          'No token signing secret configured. Set INFRA_TOKEN_SECRET or INFRA_KEY_ENCRYPTION_SECRET.',
      });
    }

    const expiresIn = process.env.INFRA_TOKEN_TTL || '10m';
    const token = jwt.sign(
      {
        scope: 'infra',
        userId: req.user?.userId || null,
      },
      secret,
      { expiresIn }
    );

    return res.status(200).json({
      tokenType: 'Bearer',
      infraToken: token,
      expiresIn,
      scope: 'infra',
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getInfrastructureStatus = async (req, res) => {
  try {
    const auth = validateInfraKey(req);
    if (!auth.ok) {
      return res.status(auth.code).json({ error: auth.message });
    }

    const result = await infrastructureService.getWahaInfrastructureStatus();
    if (!result.success) {
      return res.status(500).json({ error: result.error, stderr: result.stderr });
    }

    return res.status(200).json({
      workersCount: result.workers.length,
      workers: result.workers,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const startInfrastructure = async (req, res) => {
  try {
    const auth = validateInfraKey(req);
    if (!auth.ok) {
      return res.status(auth.code).json({ error: auth.message });
    }

    const startResult = await infrastructureService.startWahaInfrastructure();
    if (!startResult.success) {
      return res.status(500).json({
        error: startResult.error,
        stdout: startResult.stdout,
        stderr: startResult.stderr,
      });
    }

    const shouldBootstrap = req.body?.bootstrapSession !== false;
    let bootstrap = null;
    if (shouldBootstrap) {
      bootstrap = await wahaService.bootstrapDefaultSession({
        webhookUrl: req.body?.webhookUrl || process.env.WEBHOOK_BASE_URL || null,
        sessionName: process.env.WAHA_SESSION || 'default',
      });
    }

    return res.status(200).json({
      message: 'WAHA infrastructure start command executed',
      started: true,
      bootstrap,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const stopInfrastructure = async (req, res) => {
  try {
    const auth = validateInfraKey(req);
    if (!auth.ok) {
      return res.status(auth.code).json({ error: auth.message });
    }

    const logoutSessionFirst = req.body?.logoutSessionFirst !== false;
    let logout = null;
    if (logoutSessionFirst) {
      logout = await wahaService.logoutSession(process.env.WAHA_SESSION || 'default');
    }

    const stopResult = await infrastructureService.stopWahaInfrastructure();
    if (!stopResult.success) {
      return res.status(500).json({
        error: stopResult.error,
        stdout: stopResult.stdout,
        stderr: stopResult.stderr,
        logout,
      });
    }

    return res.status(200).json({
      message: 'WAHA infrastructure stop command executed',
      stopped: true,
      logout,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getSessionState = async (req, res) => {
  try {
    const raw = await wahaService.getSessionStatus();
    return res.status(200).json(normalizeSessionState(raw));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const defaultFlowStages = () => [
  { stage: 0, key: 'welcome', enabled: true, message: '', delayToNextDays: 2, sendHour: 10, sendMinute: 0 },
  { stage: 2, key: 'day2', enabled: true, message: '', delayToNextDays: 2, sendHour: 10, sendMinute: 0 },
  { stage: 4, key: 'day4', enabled: true, message: '', delayToNextDays: 3, sendHour: 10, sendMinute: 0 },
  { stage: 7, key: 'day7', enabled: true, message: '', delayToNextDays: null, sendHour: 10, sendMinute: 0 },
];

const defaultAbsentReminderConfig = () => ({
  enabled: true,
  messageTemplate:
    "Hi {{firstName}},\nWe missed you {{weekText}}!\nJust checking in, hope you're doing well.\n\nIs everything okay?\nReply:\n1 - I'm fine, will be back soon\n2 - I need prayer/support\n3 - Please call me",
  responseOptions: [
    {
      code: '1',
      matches: ['fine', 'back soon', 'i am fine'],
      responseMessage:
        "Thanks {{firstName}}. We are glad to hear from you and look forward to seeing you soon.",
      conversationStage: 'awaiting_reply',
    },
    {
      code: '2',
      matches: ['prayer', 'support', 'need prayer'],
      responseMessage:
        'Thank you for sharing. Our team will pray with you and reach out shortly.',
      conversationStage: 'prayer_requested',
    },
    {
      code: '3',
      matches: ['call', 'please call me'],
      responseMessage:
        'Thanks {{firstName}}. A team member will call you as soon as possible.',
      conversationStage: 'escalated_to_human',
      journeyStatus: 'escalated',
      escalationNotes: 'Absent reminder response requested a call.',
    },
  ],
});

const getFollowUpFlow = async (req, res) => {
  try {
    let config = await FollowUpFlowConfig.findOne({ isActive: true }).sort({
      updatedAt: -1,
    });
    if (!config) {
      config = await FollowUpFlowConfig.create({
        name: 'Default Follow-up Flow',
        isActive: true,
        stages: defaultFlowStages(),
        absentReminder: defaultAbsentReminderConfig(),
      });
    }
    return res.status(200).json(config);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const updateFollowUpFlow = async (req, res) => {
  try {
    const { name, stages, absentReminder } = req.body || {};
    if (!Array.isArray(stages)) {
      return res.status(400).json({ error: 'stages array is required' });
    }
    if (stages.length === 0) {
      return res.status(400).json({ error: 'stages array cannot be empty' });
    }

    const seenStages = new Set();
    const seenKeys = new Set();
    let enabledCount = 0;

    for (const stage of stages) {
      if (!Number.isInteger(stage.stage) || stage.stage < 0) {
        return res.status(400).json({ error: `Invalid stage: ${stage.stage}` });
      }
      if (seenStages.has(stage.stage)) {
        return res
          .status(400)
          .json({ error: `Duplicate stage detected: ${stage.stage}` });
      }
      seenStages.add(stage.stage);

      if (typeof stage.key !== 'string' || !stage.key.trim()) {
        return res.status(400).json({
          error: `Stage ${stage.stage} key is required`,
        });
      }
      if (seenKeys.has(stage.key)) {
        return res
          .status(400)
          .json({ error: `Duplicate key detected: ${stage.key}` });
      }
      seenKeys.add(stage.key);

      if (typeof stage.enabled !== 'boolean') {
        return res
          .status(400)
          .json({ error: `Stage ${stage.stage} enabled must be boolean` });
      }
      if (stage.enabled) enabledCount++;

      if (typeof stage.sendHour !== 'number' || stage.sendHour < 0 || stage.sendHour > 23) {
        return res.status(400).json({
          error: `Stage ${stage.stage} sendHour must be between 0 and 23`,
        });
      }

      if (
        typeof stage.sendMinute !== 'number' ||
        stage.sendMinute < 0 ||
        stage.sendMinute > 59
      ) {
        return res.status(400).json({
          error: `Stage ${stage.stage} sendMinute must be between 0 and 59`,
        });
      }

      if (
        stage.delayToNextDays !== null &&
        (typeof stage.delayToNextDays !== 'number' || stage.delayToNextDays < 0)
      ) {
        return res.status(400).json({
          error: `Stage ${stage.stage} delayToNextDays must be null or >= 0`,
        });
      }

      if (stage.responseOptions !== undefined) {
        if (!Array.isArray(stage.responseOptions)) {
          return res.status(400).json({
            error: `Stage ${stage.stage} responseOptions must be an array`,
          });
        }

        const seenOptionCodes = new Set();
        for (const option of stage.responseOptions) {
          if (typeof option.code !== 'string' || !option.code.trim()) {
            return res.status(400).json({
              error: `Stage ${stage.stage} responseOptions[].code is required`,
            });
          }
          if (seenOptionCodes.has(option.code)) {
            return res.status(400).json({
              error: `Stage ${stage.stage} has duplicate response option code: ${option.code}`,
            });
          }
          seenOptionCodes.add(option.code);

          if (option.matches !== undefined && !Array.isArray(option.matches)) {
            return res.status(400).json({
              error: `Stage ${stage.stage} responseOptions[].matches must be an array`,
            });
          }

          if (
            option.journeyStatus !== undefined &&
            option.journeyStatus !== null &&
            !['active', 'completed', 'paused', 'escalated', 'opted_out'].includes(
              option.journeyStatus
            )
          ) {
            return res.status(400).json({
              error: `Stage ${stage.stage} responseOptions[].journeyStatus is invalid`,
            });
          }

          if (
            option.nextStageOverride !== undefined &&
            option.nextStageOverride !== null &&
            (!Number.isInteger(option.nextStageOverride) ||
              option.nextStageOverride < 0)
          ) {
            return res.status(400).json({
              error: `Stage ${stage.stage} responseOptions[].nextStageOverride must be null or a non-negative integer`,
            });
          }
        }
      }
    }
    if (enabledCount === 0) {
      return res
        .status(400)
        .json({ error: 'At least one stage must be enabled' });
    }

    if (absentReminder !== undefined) {
      if (typeof absentReminder !== 'object' || absentReminder === null) {
        return res.status(400).json({
          error: 'absentReminder must be an object',
        });
      }

      if (
        absentReminder.enabled !== undefined &&
        typeof absentReminder.enabled !== 'boolean'
      ) {
        return res.status(400).json({
          error: 'absentReminder.enabled must be boolean',
        });
      }

      if (
        absentReminder.messageTemplate !== undefined &&
        typeof absentReminder.messageTemplate !== 'string'
      ) {
        return res.status(400).json({
          error: 'absentReminder.messageTemplate must be string',
        });
      }

      if (
        absentReminder.responseOptions !== undefined &&
        !Array.isArray(absentReminder.responseOptions)
      ) {
        return res.status(400).json({
          error: 'absentReminder.responseOptions must be an array',
        });
      }

      if (Array.isArray(absentReminder.responseOptions)) {
        const seenCodes = new Set();
        for (const option of absentReminder.responseOptions) {
          if (typeof option.code !== 'string' || !option.code.trim()) {
            return res.status(400).json({
              error: 'absentReminder.responseOptions[].code is required',
            });
          }
          if (seenCodes.has(option.code)) {
            return res.status(400).json({
              error: `Duplicate absent reminder response option code: ${option.code}`,
            });
          }
          seenCodes.add(option.code);

          if (option.matches !== undefined && !Array.isArray(option.matches)) {
            return res.status(400).json({
              error: 'absentReminder.responseOptions[].matches must be an array',
            });
          }
        }
      }
    }

    const sanitizedStages = [...stages].sort((a, b) => a.stage - b.stage);

    let config = await FollowUpFlowConfig.findOne({ isActive: true }).sort({
      updatedAt: -1,
    });

    if (!config) {
      config = await FollowUpFlowConfig.create({
        name: name || 'Default Follow-up Flow',
        isActive: true,
        stages: sanitizedStages,
        absentReminder:
          absentReminder !== undefined
            ? absentReminder
            : defaultAbsentReminderConfig(),
        updatedBy: req.user?.userId || null,
      });
    } else {
      config.name = name || config.name;
      config.stages = sanitizedStages;
      if (absentReminder !== undefined) {
        config.absentReminder = absentReminder;
      }
      config.updatedBy = req.user?.userId || null;
      await config.save();
    }

    return res.status(200).json({
      message: 'Follow-up flow updated',
      config,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const resetFollowUpFlow = async (req, res) => {
  try {
    const stages = defaultFlowStages();
    const absentReminder = defaultAbsentReminderConfig();
    let config = await FollowUpFlowConfig.findOne({ isActive: true }).sort({
      updatedAt: -1,
    });

    if (!config) {
      config = await FollowUpFlowConfig.create({
        name: 'Default Follow-up Flow',
        isActive: true,
        stages,
        absentReminder,
        updatedBy: req.user?.userId || null,
      });
    } else {
      config.stages = stages;
      config.absentReminder = absentReminder;
      config.updatedBy = req.user?.userId || null;
      await config.save();
    }

    return res.status(200).json({
      message: 'Follow-up flow reset to defaults',
      config,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const buildStopNote = (req, reason) => {
  const actor = req.user?.name || req.user?.userId || 'system';
  const why = reason ? ` Reason: ${reason}` : '';
  return `Stopped by ${actor} on ${new Date().toISOString()}.${why}`;
};

const stopMemberJourney = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { reason } = req.body || {};

    const journey = await FollowUpJourney.findOne({
      memberId,
      status: { $in: ['active', 'escalated'] },
    });

    if (!journey) {
      return res
        .status(404)
        .json({ error: 'No active follow-up journey found for this member' });
    }

    journey.status = 'paused';
    journey.nextMessageAt = null;
    journey.escalationNotes = buildStopNote(req, reason);
    await journey.save();

    await MembersModel.findByIdAndUpdate(memberId, {
      $set: { whatsappConversationStage: 'completed' },
    });

    return res.status(200).json({
      message: 'Follow-up journey stopped',
      journeyId: journey._id,
      memberId,
      status: journey.status,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const stopJourneyById = async (req, res) => {
  try {
    const { journeyId } = req.params;
    const { reason } = req.body || {};

    const journey = await FollowUpJourney.findOne({
      _id: journeyId,
      status: { $in: ['active', 'escalated'] },
    });

    if (!journey) {
      return res.status(404).json({ error: 'Active follow-up journey not found' });
    }

    journey.status = 'paused';
    journey.nextMessageAt = null;
    journey.escalationNotes = buildStopNote(req, reason);
    await journey.save();

    if (journey.memberId) {
      await MembersModel.findByIdAndUpdate(journey.memberId, {
        $set: { whatsappConversationStage: 'completed' },
      });
    }

    return res.status(200).json({
      message: 'Follow-up journey stopped',
      journeyId: journey._id,
      memberId: journey.memberId,
      status: journey.status,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const stopActiveJourneys = async (req, res) => {
  try {
    const { memberIds = [], reason } = req.body || {};
    const query = { status: { $in: ['active', 'escalated'] } };
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      query.memberId = { $in: memberIds };
    }

    const note = buildStopNote(req, reason);

    const result = await FollowUpJourney.updateMany(query, {
      $set: {
        status: 'paused',
        nextMessageAt: null,
        escalationNotes: note,
      },
    });

    if (Array.isArray(memberIds) && memberIds.length > 0) {
      await MembersModel.updateMany(
        { _id: { $in: memberIds } },
        { $set: { whatsappConversationStage: 'completed' } }
      );
    }

    return res.status(200).json({
      message: 'Active follow-up journeys stopped',
      matched: result.matchedCount || 0,
      modified: result.modifiedCount || 0,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  startSession,
  bootstrapSession,
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
  generateInfrastructureToken,
  getInfrastructureStatus,
  startInfrastructure,
  stopInfrastructure,
  stopMemberJourney,
  stopJourneyById,
  stopActiveJourneys,
  getFollowUpFlow,
  updateFollowUpFlow,
  resetFollowUpFlow,
};
