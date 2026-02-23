const mongoose = require('mongoose');

const whatsappActivitySchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Members',
      required: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
    },
    direction: {
      type: String,
      enum: ['outbound', 'inbound'],
      required: true,
    },
    messageType: {
      type: String,
      enum: [
        'welcome',
        'follow_up',
        'broadcast',
        'manual',
        'reply',
        'prayer_request',
        'absent_reminder',
        'community_link',
      ],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    followUpStage: {
      type: Number,
      default: null,
    },
    conversationStage: {
      type: String,
      enum: [
        'welcome_sent',
        'awaiting_reply',
        'prayer_requested',
        'smallgroup_interested',
        'membership_interested',
        'escalated_to_human',
        'completed',
        'idle',
      ],
      default: 'idle',
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
      default: 'queued',
    },
    wahaMessageId: {
      type: String,
      default: null,
    },
    errorDetails: {
      type: String,
      default: null,
    },
    broadcastId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BroadcastHistory',
      default: null,
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Members',
      default: null,
    },
  },
  { timestamps: true }
);

whatsappActivitySchema.index({ memberId: 1, createdAt: -1 });
whatsappActivitySchema.index({ phone: 1, createdAt: -1 });
whatsappActivitySchema.index({ broadcastId: 1 });
whatsappActivitySchema.index({ conversationStage: 1 });

module.exports = mongoose.model('WhatsappActivity', whatsappActivitySchema);
