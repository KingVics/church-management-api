const wahaService = require('./wahaService');
const templates = require('../utils/messageTemplates');
const BroadcastHistory = require('../model/BroadcastHistory');
const WhatsappActivity = require('../model/WhatsappActivity');
const FollowUpFlowConfig = require('../model/FollowUpFlowConfig');

class BroadcastService {
  async _getAbsentReminderConfig() {
    const config = await FollowUpFlowConfig.findOne({
      configType: 'absent_reminder',
      isDefault: true,
      isActive: true,
    }).sort({ updatedAt: -1 });
    return config?.absentReminder || null;
  }

  _formatAbsentMessage(template, member, weeksMissed) {
    const weekText =
      weeksMissed === 1 ? 'last week' : `the last ${weeksMissed} weeks`;
    return String(template || '')
      .replace(/\{\{firstName\}\}/g, member?.firstName || 'Friend')
      .replace(/\{\{lastName\}\}/g, member?.lastName || '')
      .replace(/\{\{churchName\}\}/g, process.env.CHURCH_NAME || 'Victory Chapel')
      .replace(/\{\{weekText\}\}/g, weekText)
      .replace(/\{\{weeksMissed\}\}/g, String(weeksMissed));
  }

  async sendBroadcast({
    type,
    content,
    members,
    sentBy,
    audience = 'all_opted_in',
    departmentId = null,
  }) {
    const eligibleMembers = members.filter((m) => m.whatsappOptIn && m.phone);

    if (eligibleMembers.length === 0) {
      return {
        success: false,
        message: 'No eligible members found (none opted in or no phone numbers)',
      };
    }

    const broadcast = await BroadcastHistory.create({
      sentBy,
      type,
      content,
      audience,
      departmentId,
      totalRecipients: eligibleMembers.length,
      recipients: eligibleMembers.map((m) => ({
        memberId: m._id,
        phone: m.phone,
        status: 'queued',
      })),
      status: 'in_progress',
    });

    this._processBroadcastQueue(broadcast, eligibleMembers, content);

    return {
      success: true,
      broadcastId: broadcast._id,
      totalRecipients: eligibleMembers.length,
      message: `Broadcast started. Sending to ${eligibleMembers.length} members.`,
    };
  }

  async _processBroadcastQueue(broadcast, members, content) {
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < members.length; i++) {
      const member = members[i];

      try {
        const result = await wahaService.sendText(member.phone, content);

        broadcast.recipients[i].status = result.success ? 'sent' : 'failed';
        broadcast.recipients[i].sentAt = new Date();
        if (!result.success) {
          broadcast.recipients[i].error =
            JSON.stringify(result.error) || 'Unknown error';
        }

        await WhatsappActivity.create({
          memberId: member._id,
          phone: member.phone,
          direction: 'outbound',
          messageType: 'broadcast',
          content,
          status: result.success ? 'sent' : 'failed',
          broadcastId: broadcast._id,
          sentBy: broadcast.sentBy,
          errorDetails: result.success ? null : JSON.stringify(result.error),
        });

        if (result.success) successCount++;
        else failCount++;

        await this._delay(3000 + Math.random() * 2000);
      } catch (error) {
        failCount++;
        broadcast.recipients[i].status = 'failed';
        broadcast.recipients[i].error = error.message;
      }

      if ((i + 1) % 10 === 0) {
        broadcast.successCount = successCount;
        broadcast.failCount = failCount;
        await broadcast.save();
      }
    }

    broadcast.successCount = successCount;
    broadcast.failCount = failCount;
    broadcast.status = 'completed';
    broadcast.completedAt = new Date();
    await broadcast.save();
  }

  sendSundayReminder(members, sentBy, serviceTime = '9:00 AM') {
    const content = templates.sundayReminder(
      process.env.CHURCH_NAME || 'Victory Chapel',
      serviceTime
    );
    return this.sendBroadcast({
      type: 'sunday_reminder',
      content,
      members,
      sentBy,
      audience: 'all_opted_in',
    });
  }

  sendEventUpdate(members, sentBy, eventDetails) {
    const content = templates.eventUpdate(
      eventDetails.name,
      eventDetails.date,
      eventDetails.time,
      eventDetails.venue
    );
    return this.sendBroadcast({
      type: 'event_update',
      content,
      members,
      sentBy,
      audience: 'all_opted_in',
    });
  }

  sendEmergencyAnnouncement(members, sentBy, message) {
    const content = templates.emergency(
      message,
      process.env.CHURCH_NAME || 'Victory Chapel'
    );
    return this.sendBroadcast({
      type: 'emergency',
      content,
      members,
      sentBy,
      audience: 'all_opted_in',
    });
  }

  async sendAbsentReminders(absentMembers, sentBy, weeksMissed = 1) {
    const results = [];
    const absentConfig = await this._getAbsentReminderConfig();

    for (const member of absentMembers) {
      if (!member.whatsappOptIn || !member.phone) continue;

      const content =
        absentConfig?.enabled && absentConfig?.messageTemplate
          ? this._formatAbsentMessage(
              absentConfig.messageTemplate,
              member,
              weeksMissed
            )
          : templates.absentReminder(member.firstName, weeksMissed);
      const result = await wahaService.sendText(member.phone, content);

      await WhatsappActivity.create({
        memberId: member._id,
        phone: member.phone,
        direction: 'outbound',
        messageType: 'absent_reminder',
        content,
        status: result.success ? 'sent' : 'failed',
        sentBy,
        conversationStage: 'awaiting_reply',
      });

      results.push({
        memberId: member._id,
        phone: member.phone,
        success: result.success,
      });

      await this._delay(3000 + Math.random() * 2000);
    }
    return results;
  }

  async sendManualMessage(member, message, sentBy) {
    if (!member.phone) {
      return { success: false, error: 'Member has no phone number' };
    }

    const result = await wahaService.sendText(member.phone, message);

    await WhatsappActivity.create({
      memberId: member._id,
      phone: member.phone,
      direction: 'outbound',
      messageType: 'manual',
      content: message,
      status: result.success ? 'sent' : 'failed',
      sentBy,
      wahaMessageId: result.data?.messageId || null,
      errorDetails: result.success ? null : JSON.stringify(result.error),
    });

    await member.constructor.findByIdAndUpdate(member._id, {
      $set: { lastWhatsappMessageSent: new Date() },
      $inc: { totalMessagesSent: 1 },
    });

    return result;
  }

  sendToGroup(members, message, sentBy) {
    return this.sendBroadcast({
      type: 'custom',
      content: message,
      members,
      sentBy,
      audience: 'custom_list',
    });
  }

  async getBroadcastHistory(page = 1, limit = 20, filters = {}) {
    const query = {};
    if (filters.type) query.type = filters.type;
    if (filters.sentBy) query.sentBy = filters.sentBy;
    if (filters.status) query.status = filters.status;

    const total = await BroadcastHistory.countDocuments(query);
    const broadcasts = await BroadcastHistory.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sentBy', 'firstName lastName email')
      .select('-recipients');

    return { broadcasts, total, page, pages: Math.ceil(total / limit) };
  }

  getBroadcastDetail(broadcastId) {
    return BroadcastHistory.findById(broadcastId)
      .populate('sentBy', 'firstName lastName email')
      .populate('recipients.memberId', 'firstName lastName phone');
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new BroadcastService();
