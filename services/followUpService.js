const wahaService = require('./wahaService');
const templates = require('../utils/messageTemplates');
const FollowUpJourney = require('../model/FollowUpJourney');
const WhatsappActivity = require('../model/WhatsappActivity');
const FollowUpFlowConfig = require('../model/FollowUpFlowConfig');
const MembersModel = require('../model/members');
const { default: axios } = require('axios');

class FollowUpService {
  _defaultFlowStages() {
    return [
      { stage: 0, key: 'welcome', enabled: true, message: '', delayToNextDays: 2, sendHour: 10, sendMinute: 0 },
      { stage: 2, key: 'day2', enabled: true, message: '', delayToNextDays: 2, sendHour: 10, sendMinute: 0 },
      { stage: 4, key: 'day4', enabled: true, message: '', delayToNextDays: 3, sendHour: 10, sendMinute: 0 },
      { stage: 7, key: 'day7', enabled: true, message: '', delayToNextDays: null, sendHour: 10, sendMinute: 0 },
    ];
  }

  async ensureDefaultFlowConfig() {
    const [followDefault, absentDefault] = await Promise.all([
      FollowUpFlowConfig.findOne({
        configType: 'follow_up',
        isDefault: true,
      }).sort({ updatedAt: -1 }),
      FollowUpFlowConfig.findOne({
        configType: 'absent_reminder',
        isDefault: true,
      }).sort({ updatedAt: -1 }),
    ]);

    let ensuredFollow = followDefault;
    let ensuredAbsent = absentDefault;

    if (!ensuredFollow) {
      ensuredFollow = await FollowUpFlowConfig.create({
        configType: 'follow_up',
        name: 'Default Follow-up Flow',
        isDefault: true,
        isActive: true,
        stages: this._defaultFlowStages(),
      });
    }

    if (!ensuredAbsent) {
      ensuredAbsent = await FollowUpFlowConfig.create({
        configType: 'absent_reminder',
        name: 'Default Absent Reminder',
        isDefault: true,
        isActive: true,
        absentReminder: this._defaultAbsentReminderConfig(),
      });
    }

    return { followUp: ensuredFollow, absentReminder: ensuredAbsent };
  }

  async getActiveFlowStages() {
    const config = await FollowUpFlowConfig.findOne({
      configType: 'follow_up',
      isDefault: true,
      isActive: true,
    }).sort({
      updatedAt: -1,
    });
    if (config?.stages?.length) return config.stages;
    return this._defaultFlowStages();
  }

  async _getActiveFlowConfig() {
    return FollowUpFlowConfig.findOne({
      configType: 'follow_up',
      isDefault: true,
      isActive: true,
    }).sort({
      updatedAt: -1,
    });
  }

  async _getFlowConfigById(configId) {
    if (!configId) return null;
    return FollowUpFlowConfig.findOne({
      _id: configId,
      configType: 'follow_up',
      isActive: true,
    });
  }

  async _getDefaultAbsentReminderConfig() {
    return FollowUpFlowConfig.findOne({
      configType: 'absent_reminder',
      isDefault: true,
      isActive: true,
    }).sort({
      updatedAt: -1,
    });
  }

  _defaultAbsentReminderConfig() {
    return {
      enabled: true,
      responseOptions: [
        {
          code: '1',
          matches: ['fine', 'back soon'],
          responseMessage:
            "Thanks {{firstName}}. We are glad to hear from you and look forward to seeing you soon.",
        },
        {
          code: '2',
          matches: ['prayer', 'support'],
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
        },
      ],
    };
  }

  _findStageConfig(stages, stage) {
    return stages.find((s) => s.stage === stage) || null;
  }

  _orderedStages(stages) {
    return [...(stages || [])].sort((a, b) => a.stage - b.stage);
  }

  _firstEnabledStage(stages) {
    const ordered = this._orderedStages(stages);
    return ordered.find((s) => s.enabled) || null;
  }

  _nextStage(currentStage, stages) {
    const ordered = this._orderedStages(stages).filter((s) => s.enabled);
    const index = ordered.findIndex((s) => s.stage === currentStage);
    if (index === -1) {
      const next = ordered.find((s) => s.stage > currentStage);
      return next ? next.stage : null;
    }
    const next = ordered[index + 1];
    return next ? next.stage : null;
  }

  _fallbackDelayByStage(currentStage) {
    if (currentStage === 0) return 2;
    if (currentStage === 2) return 3;
    if (currentStage === 4) return 3;
    return null;
  }

  _interpolateMessage(message, member) {
    return String(message || '')
      .replace(/\{\{firstName\}\}/g, member?.firstName || 'Friend')
      .replace(/\{\{lastName\}\}/g, member?.lastName || '')
      .replace(/\{\{churchName\}\}/g, process.env.CHURCH_NAME || 'Victory Chapel')
      .replace(/\{\{phone\}\}/g, member?.phone || '');
  }

  _defaultMessageForStage(stage, member) {
    const firstName = member?.firstName || 'Friend';
    if (stage === 0) return templates.welcome(firstName, process.env.CHURCH_NAME || 'Victory Chapel');
    if (stage === 2) return templates.followUpDay2(firstName);
    if (stage === 4) return templates.followUpDay4(firstName);
    if (stage === 7) return templates.followUpDay7(firstName);
    return `Hi ${firstName}, we are checking in from ${process.env.CHURCH_NAME || 'Victory Chapel'}. Reply to this message if you need support or prayer.`;
  }

  _resolveStageMessage(stage, stageConfig, member) {
    if (stageConfig?.message?.trim()) {
      return this._interpolateMessage(stageConfig.message, member);
    }
    return this._defaultMessageForStage(stage, member);
  }

  _normalizeComparable(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  _findConfiguredResponseOption(reply, options = []) {
    const normalizedReply = this._normalizeComparable(reply);
    if (!normalizedReply || !Array.isArray(options) || options.length === 0) {
      return null;
    }

    for (const option of options) {
      const candidates = [
        option?.code,
        ...(Array.isArray(option?.matches) ? option.matches : []),
      ]
        .map((v) => this._normalizeComparable(v))
        .filter(Boolean);

      if (candidates.includes(normalizedReply)) {
        return option;
      }
    }
    return null;
  }

  async _applyConfiguredResponseOption({
    option,
    journey,
    member,
    phone,
  }) {
    const action = option?.code
      ? `configured_option_${option.code}`
      : 'configured_option';

    if (option?.responseMessage?.trim()) {
      const message = this._interpolateMessage(option.responseMessage, member);
      await wahaService.sendText(phone, message);
    }

    if (option?.conversationStage && member) {
      member.whatsappConversationStage = option.conversationStage;
      await member.save();
    }

    if (typeof option?.nextStageOverride === 'number') {
      journey.currentStage = option.nextStageOverride;
    }

    if (option?.journeyStatus) {
      journey.status = option.journeyStatus;
      if (option.journeyStatus !== 'active') {
        journey.nextMessageAt = null;
      }
    }

    if (option?.escalationNotes) {
      journey.escalationNotes = option.escalationNotes;
    }

    return action;
  }

  async _handleAbsentReminderReply(member, phone, reply) {
    if (!member?._id) return null;

    const recentAbsent = await WhatsappActivity.findOne({
      memberId: member._id,
      direction: 'outbound',
      messageType: 'absent_reminder',
    }).sort({ createdAt: -1 });

    if (!recentAbsent) return null;

    await WhatsappActivity.create({
      memberId: member._id,
      phone,
      direction: 'inbound',
      messageType: 'reply',
      content: reply,
      conversationStage: 'awaiting_reply',
      status: 'read',
    });

    const absentTemplate = await this._getDefaultAbsentReminderConfig();
    const absentConfig =
      absentTemplate?.absentReminder || this._defaultAbsentReminderConfig();
    if (!absentConfig?.enabled) return { action: 'absent_reply_ignored' };

    const option = this._findConfiguredResponseOption(
      reply,
      absentConfig.responseOptions || []
    );

    if (!option) {
      return { action: 'absent_reply_unmapped' };
    }

    if (option?.responseMessage?.trim()) {
      const responseMessage = this._interpolateMessage(option.responseMessage, member);
      const sendResult = await wahaService.sendText(phone, responseMessage);
      await WhatsappActivity.create({
        memberId: member._id,
        phone,
        direction: 'outbound',
        messageType: 'manual',
        content: responseMessage,
        conversationStage: 'completed',
        status: sendResult.success ? 'sent' : 'failed',
        wahaMessageId: sendResult.data?.messageId || null,
        errorDetails: sendResult.success ? null : JSON.stringify(sendResult.error),
      });
    }

    if (option?.conversationStage) {
      member.whatsappConversationStage = option.conversationStage;
    }
    member.lastWhatsappReply = new Date();
    member.totalReplies = (member.totalReplies || 0) + 1;
    member.whatsappEngagementStatus = 'active';
    await member.save();

    return { action: `absent_${option.code}` };
  }

  async testAbsentReminderReply({
    phone,
    message,
    memberId = null,
    sendResponse = false,
  }) {
    const cleanedPhone = this._normalizePhone(phone);
    const reply = this._normalizeInboundText(message);

    let member = null;
    if (memberId) {
      member = await MembersModel.findById(memberId);
    }
    if (!member && cleanedPhone) {
      member = await MembersModel.findOne({
        phone: { $regex: cleanedPhone },
      });
    }
    if (!member) {
      return {
        success: false,
        error: 'Member not found for provided phone/memberId',
      };
    }

    const absentTemplate = await this._getDefaultAbsentReminderConfig();
    const absentConfig =
      absentTemplate?.absentReminder || this._defaultAbsentReminderConfig();
    const option = this._findConfiguredResponseOption(
      reply,
      absentConfig.responseOptions || []
    );

    if (!option) {
      return {
        success: true,
        matched: false,
        action: 'absent_reply_unmapped',
      };
    }

    let sent = null;
    if (sendResponse && option?.responseMessage?.trim()) {
      const responseMessage = this._interpolateMessage(option.responseMessage, member);
      const sendResult = await wahaService.sendText(cleanedPhone || member.phone, responseMessage);
      sent = {
        success: sendResult.success,
        messageId: sendResult.data?.messageId || null,
        error: sendResult.success ? null : sendResult.error,
      };
    }

    return {
      success: true,
      matched: true,
      action: `absent_${option.code}`,
      option: {
        code: option.code,
        matches: option.matches || [],
        conversationStage: option.conversationStage || null,
        journeyStatus: option.journeyStatus || null,
        escalationNotes: option.escalationNotes || null,
        nextStageOverride: option.nextStageOverride ?? null,
      },
      sent,
    };
  }

  _normalizeInboundText(text) {
    return String(text || '').trim();
  }

  _normalizePhone(phone) {
    return String(phone || '').replace(/\D/g, '');
  }

  async _resolveRealPhoneFromJid(jid) {
    if (!jid) return null;

    const id = jid.split('@')[0];

    // If already normal phone
    if (id.startsWith('234') && id.length === 13) {
      return `0${id.slice(3)}`;
    }

    if (id.startsWith('0') && id.length === 11) {
      return id.slice(1);
    }

    // If LID → resolve via WAHA
    if (jid.endsWith('@lid')) {
      try {
        const response = await axios.get(
          `${process.env.WAHA_API_URL}/api/contacts`,
          {
            params: {
              contactId: jid,
              session: 'default'
            },
            headers: {
              'X-Api-Key': process.env.WAHA_API_KEY
            }
          }
        );;

        const contact = response.data;

        if (contact?.number) {
          const full = contact.number;
          return full.startsWith('234') ? '0' + full.slice(3) : full;
        }

        return null;
      } catch (err) {
        console.error('Failed to resolve LID:', err.message);
        return null;
      }
    }

    return null;
  }

  _isOptOut(text) {
    const t = String(text || '').trim().toLowerCase();
    return ['stop', 'unsubscribe', 'optout', 'opt-out', 'cancel', 'quit'].includes(
      t
    );
  }

  _isOptIn(text) {
    const t = String(text || '').trim().toLowerCase();
    return ['start', 'subscribe', 'optin', 'opt-in', 'unstop'].includes(t);
  }

  _isHelp(text) {
    const t = String(text || '').trim().toLowerCase();
    return ['help', 'support', '?'].includes(t);
  }

  _detectOption(reply, currentStage) {
    const raw = String(reply || '').trim().toLowerCase();
    const compact = raw.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    if (/^1(\b|$)/.test(compact) || compact.includes('option 1')) return 1;
    if (/^2(\b|$)/.test(compact) || compact.includes('option 2')) return 2;
    if (/^3(\b|$)/.test(compact) || compact.includes('option 3')) return 3;

    if (['yes', 'yeah', 'y', 'sure', 'okay', 'ok', 'interested'].includes(compact))
      return 1;
    if (['no', 'nope', 'n', 'later', 'not now', 'maybe later'].includes(compact))
      return 2;
    if (['info', 'information', 'details', 'more info', 'tell me more'].includes(compact))
      return 3;

    // Stage-aware default interpretation.
    if (currentStage === 7 && compact === 'decline') return 2;
    return null;
  }

  _nextMessageFromStageConfig(stageConfig) {
    const delay = stageConfig?.delayToNextDays;
    if (delay === null || delay === undefined) return null;
    const next = new Date();
    next.setDate(next.getDate() + delay);
    next.setHours(stageConfig?.sendHour ?? 10, stageConfig?.sendMinute ?? 0, 0, 0);
    return next;
  }

  _buildNextMessageAtFromStage(currentStage) {
    const delayDays = this._fallbackDelayByStage(currentStage);
    if (!delayDays) return null;
    const next = new Date();
    next.setDate(next.getDate() + delayDays);
    next.setHours(10, 0, 0, 0);
    return next;
  }

  async startJourney(member) {
    try {
      await this.ensureDefaultFlowConfig();
      const activeConfig = await this._getActiveFlowConfig();
      const flowStages = this._orderedStages(
        activeConfig?.stages?.length ? activeConfig.stages : this._defaultFlowStages()
      );

      const existing = await FollowUpJourney.findOne({ memberId: member._id });
      if (existing) {
        // Resume paused/stopped journey without resetting stage.
        if (existing.status === 'paused') {
          existing.status = 'active';
          if (!existing.nextMessageAt) {
            const stageConfig = this._findStageConfig(flowStages, existing.currentStage);
            existing.nextMessageAt =
              this._nextMessageFromStageConfig(stageConfig) ||
              this._buildNextMessageAtFromStage(existing.currentStage);
          }
          await existing.save();
        }
        return existing;
      }

      const startStageConfig = this._firstEnabledStage(flowStages);
      const startStage = startStageConfig?.stage ?? 0;
      const welcomeMsg = this._resolveStageMessage(startStage, startStageConfig, member);
      const welcomeResult = await wahaService.sendText(member.phone, welcomeMsg);

      await WhatsappActivity.create({
        memberId: member._id,
        phone: member.phone,
        direction: 'outbound',
        messageType: 'welcome',
        content: welcomeMsg,
        followUpStage: startStage,
        conversationStage: startStage === 0 ? 'welcome_sent' : 'awaiting_reply',
        status: welcomeResult.success ? 'sent' : 'failed',
        wahaMessageId: welcomeResult.data?.messageId || null,
        errorDetails: welcomeResult.success
          ? null
          : JSON.stringify(welcomeResult.error),
      });

      const communityLink = process.env.WHATSAPP_COMMUNITY_LINK || '';
      if (communityLink) {
        await this._delay(3000);
        const linkMsg = templates.communityLink(
          communityLink,
          process.env.CHURCH_NAME || 'Victory Chapel'
        );
        await wahaService.sendText(member.phone, linkMsg);

        await WhatsappActivity.create({
          memberId: member._id,
          phone: member.phone,
          direction: 'outbound',
          messageType: 'community_link',
          content: linkMsg,
          followUpStage: 0,
          conversationStage: 'welcome_sent',
          status: 'sent',
        });
      }

      const nextMessageAt =
        this._nextMessageFromStageConfig(startStageConfig) ||
        this._buildNextMessageAtFromStage(startStage);

      return FollowUpJourney.create({
        memberId: member._id,
        phone: member.phone,
        flowConfigId: activeConfig?._id || null,
        currentStage: startStage,
        status: 'active',
        messagesSent: [{ stage: startStage, sentAt: new Date(), messageType: 'welcome' }],
        startedAt: new Date(),
        nextMessageAt,
      });
    } catch (error) {
      throw error;
    }
  }

  async processScheduledMessages() {
    const now = new Date();
    const pendingJourneys = await FollowUpJourney.find({
      status: 'active',
      nextMessageAt: { $lte: now },
    }).populate('memberId');

    for (const journey of pendingJourneys) {
      try {
        await this._sendNextStageMessage(journey);
        await this._delay(3000);
      } catch (error) {
        console.error('[FollowUp] Error processing journey:', error.message);
      }
    }
  }

  async _sendNextStageMessage(journey) {
    const member = journey.memberId;
    let flowStages = null;
    if (journey.flowConfigId) {
      const config = await this._getFlowConfigById(journey.flowConfigId);
      flowStages = config?.stages || null;
    }
    if (!flowStages || flowStages.length === 0) {
      flowStages = await this.getActiveFlowStages();
    }
    flowStages = this._orderedStages(flowStages);
    const nextStage = this._nextStage(journey.currentStage, flowStages);
    if (!nextStage) {
      journey.status = 'completed';
      journey.nextMessageAt = null;
      await journey.save();
      return;
    }

    const nextStageConfig = this._findStageConfig(flowStages, nextStage);

    const message = this._resolveStageMessage(nextStage, nextStageConfig, member);

    const result = await wahaService.sendText(journey.phone, message);

    await WhatsappActivity.create({
      memberId: member._id,
      phone: journey.phone,
      direction: 'outbound',
      messageType: 'follow_up',
      content: message,
      followUpStage: nextStage,
      conversationStage: 'awaiting_reply',
      status: result.success ? 'sent' : 'failed',
      wahaMessageId: result.data?.messageId || null,
      errorDetails: result.success ? null : JSON.stringify(result.error),
    });

    journey.currentStage = nextStage;
    journey.messagesSent.push({
      stage: nextStage,
      sentAt: new Date(),
      messageType: 'follow_up',
    });

    const nextMessageAt =
      this._nextMessageFromStageConfig(nextStageConfig) ||
      this._buildNextMessageAtFromStage(nextStage);

    if (nextMessageAt) {
      journey.nextMessageAt = nextMessageAt;
    } else {
      journey.status = 'escalated';
      journey.nextMessageAt = null;
      journey.escalationNotes =
        'Automated journey completed. Needs human follow-up.';
    }

    await journey.save();

    if (member) {
      member.followUpStage = nextStage;
      member.lastWhatsappMessageSent = new Date();
      await member.save();
    }
  }

  async handleReply(phone, messageBody) {
    console.log('Handling reply from phone:', phone, 'with message:', messageBody);
    const reply = this._normalizeInboundText(messageBody);

    let memberByPhone = await MembersModel.findOne({
      whatsapplid: phone,
    });

    if (!memberByPhone) {
      let cleanedPhone = await this._resolveRealPhoneFromJid(phone)
      memberByPhone = await MembersModel.findOne({
        phone: cleanedPhone,
      });

      if (memberByPhone) {
        memberByPhone.whatsapplid = phone;
        await memberByPhone.save();
      }
    }

    console.log('Resolved member for phone:', 'is:', memberByPhone.phone, memberByPhone?.firstName);

    if (!memberByPhone) {
      return null;
    }

    // // Global commands should work even when there is no active journey.
    if (this._isOptOut(reply) && memberByPhone) {
      memberByPhone.whatsappOptIn = false;
      memberByPhone.whatsappOptOutDate = new Date();
      await memberByPhone.save();

      await FollowUpJourney.updateMany(
        { memberId: memberByPhone._id, status: { $in: ['active', 'escalated'] } },
        { $set: { status: 'opted_out', nextMessageAt: null } }
      );

      await wahaService.sendText(
        memberByPhone.phone,
        'You have been unsubscribed from WhatsApp follow-up messages. Reply START to opt in again.'
      );

      return { action: 'opted_out', journey: null };
    }


    if (this._isOptIn(reply) && memberByPhone) {
      memberByPhone.whatsappOptIn = true;
      memberByPhone.whatsappOptInDate = new Date();
      memberByPhone.whatsappOptOutDate = null;
      await memberByPhone.save();

      await wahaService.sendText(
        memberByPhone.phone,
        'You are now subscribed again. Thank you.'
      );
      return { action: 'opted_in', journey: null };
    }

    if (this._isHelp(reply)) {
      await wahaService.sendText(
        memberByPhone.phone,
        'Reply 1, 2, or 3 to choose an option. Reply STOP to opt out, START to opt in.'
      );
      return { action: 'help', journey: null };
    }


    // const journey = await FollowUpJourney.findOne({
    //   phone: { $regex: cleanedPhone },
    //   status: { $in: ['active', 'escalated'] },
    // }).populate('memberId');

    const outboundQuery = {
      memberId: memberByPhone._id,
      direction: 'outbound',
      conversationStage: { $in: ['awaiting_reply', 'welcome_sent'] },
      messageType: { $in: ['absent_reminder', 'follow_up', 'welcome'] },
    };
    if (memberByPhone.lastWhatsappReply) {
      outboundQuery.createdAt = { $gt: memberByPhone.lastWhatsappReply };
    }
    const lastOutbound = await WhatsappActivity.findOne(outboundQuery).sort({
      createdAt: -1,
    });


    console.log(lastOutbound, 'last outbound activity awaiting reply');

    if (!lastOutbound) {
      return null;
    }

    const alreadyReplied = await WhatsappActivity.findOne({
      memberId: memberByPhone._id,
      direction: 'inbound',
      messageType: 'reply',
      createdAt: { $gt: lastOutbound.createdAt },
    }).sort({ createdAt: 1 });

    if (alreadyReplied) {
      return null;
    }


    // Handle absent reminder outside journey
    if (lastOutbound.messageType === 'absent_reminder') {
      const result = await this._handleAbsentReminderReply(
        memberByPhone,
        memberByPhone.phone,
        reply
      );

      await WhatsappActivity.findOneAndUpdate(
        {
          _id: lastOutbound._id
        },
        {
          conversationStage: 'completed'
        },
        { new: true }
      );

      return result ? { action: result.action } : null;
    }

    // console.log(`Active journey found: ${!!journey}`);
    // if (!journey) {
    //   if (memberByPhone) {
    //     const absentHandled = await this._handleAbsentReminderReply(
    //       memberByPhone,
    //       cleanedPhone,
    //       reply
    //     );
    //     if (absentHandled) return { action: absentHandled.action, journey: null };
    //   }
    //   return null;
    // }

    if (
      (lastOutbound.messageType === 'follow_up' ||
        lastOutbound.messageType === 'welcome') &&
      lastOutbound.followUpStage !== undefined
    ) {

      // For follow-up stages
      const journey = await FollowUpJourney.findOne({
        memberId: memberByPhone._id,
        status: { $in: ['active', 'escalated'] }
      }).populate('memberId');

      if (!journey) return null;

      const member = journey.memberId;
      const firstName = member?.firstName || 'Friend';
      let flowStages = null;
      if (journey.flowConfigId) {
        const config = await this._getFlowConfigById(journey.flowConfigId);
        flowStages = config?.stages || null;
      }
      if (!flowStages || flowStages.length === 0) {
        flowStages = await this.getActiveFlowStages();
      }
      const stageConfig = this._findStageConfig(flowStages, journey.currentStage);

      await WhatsappActivity.create({
        memberId: member?._id,
        phone: memberByPhone.phone,
        direction: 'inbound',
        messageType: 'reply',
        content: reply,
        followUpStage: journey.currentStage,
        conversationStage: 'awaiting_reply',
        status: 'read',
      });

      let action = 'unknown';
      const configuredOption = this._findConfiguredResponseOption(
        reply,
        stageConfig?.responseOptions || []
      );

      if (configuredOption) {
        action = await this._applyConfiguredResponseOption({
          option: configuredOption,
          journey,
          member,
          phone: memberByPhone.phone,
        });
      } else {
        action = 'unmapped_reply';
      }

      journey.replies.push({
        content: reply,
        receivedAt: new Date(),
        stage: journey.currentStage,
        action,
      });
      journey.engagementScore = this._calculateEngagement(journey);
      await journey.save();

      if (member) {
        member.lastWhatsappReply = new Date();
        member.totalReplies = (member.totalReplies || 0) + 1;
        member.whatsappEngagementStatus = 'active';
        await member.save();
      }
      await WhatsappActivity.findOneAndUpdate(
        {
          _id: lastOutbound._id
        },
        {
          conversationStage: 'completed'
        },
        { new: true }
      );
      return { action, journey };
    }

    return null;

  }

  async _handleOption1(journey, firstName, phone) {
    switch (journey.currentStage) {
      case 0:
      case 2:
        await wahaService.sendText(phone, templates.prayerRequestAck(firstName));
        await wahaService.sendText(
          phone,
          'Please share your prayer request and our prayer team will be notified.'
        );
        if (journey.memberId) {
          journey.memberId.whatsappConversationStage = 'prayer_requested';
          await journey.memberId.save();
        }
        return 'prayer_request_initiated';
      case 4:
        await wahaService.sendText(phone, templates.smallGroupInfo(firstName));
        if (journey.memberId) {
          journey.memberId.whatsappConversationStage = 'smallgroup_interested';
          await journey.memberId.save();
        }
        return 'smallgroup_interested';
      case 7:
        await wahaService.sendText(
          phone,
          `Wonderful ${firstName}! Someone from our pastoral team will be in touch soon.`
        );
        journey.status = 'escalated';
        journey.escalationNotes = 'Member accepted personal follow-up call.';
        return 'escalation_accepted';
      default:
        return 'option1_default';
    }
  }

  async _handleOption2(journey, firstName, phone) {
    switch (journey.currentStage) {
      case 0:
        await wahaService.sendText(phone, templates.smallGroupInfo(firstName));
        return 'smallgroup_info_sent';
      case 2:
        await wahaService.sendText(
          phone,
          `We've got you covered in prayer ${firstName}. God bless you.`
        );
        return 'prayer_general';
      case 4:
        await wahaService.sendText(
          phone,
          `No worries ${firstName}. The door is always open, we'll check back later.`
        );
        return 'smallgroup_deferred';
      case 7:
        await wahaService.sendText(
          phone,
          `Totally understand ${firstName}. We're always here for you.`
        );
        journey.status = 'completed';
        return 'escalation_declined';
      default:
        return 'option2_default';
    }
  }

  async _handleOption3(journey, firstName, phone) {
    switch (journey.currentStage) {
      case 0:
        await wahaService.sendText(phone, templates.membershipInfo(firstName));
        if (journey.memberId) {
          journey.memberId.whatsappConversationStage = 'membership_interested';
          await journey.memberId.save();
        }
        return 'membership_info_sent';
      case 4:
        await wahaService.sendText(
          phone,
          'Small groups meet weekly for Bible study, prayer, and fellowship. Reply 1 if you want to be connected to a group leader.'
        );
        return 'smallgroup_more_info';
      default:
        return 'option3_default';
    }
  }

  async _handlePrayerRequest(member, phone, prayerText) {
    await WhatsappActivity.create({
      memberId: member?._id,
      phone,
      direction: 'inbound',
      messageType: 'prayer_request',
      content: prayerText,
      conversationStage: 'prayer_requested',
      status: 'read',
    });

    await wahaService.sendText(
      phone,
      templates.prayerRequestAck(member?.firstName || 'Friend')
    );
  }

  _calculateEngagement(journey) {
    const replyCount = journey.replies.length;
    const stageCount = journey.messagesSent.length;
    if (replyCount === 0) return 'none';
    const ratio = replyCount / Math.max(stageCount, 1);
    if (ratio >= 0.75) return 'high';
    if (ratio >= 0.4) return 'medium';
    return 'low';
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new FollowUpService();
