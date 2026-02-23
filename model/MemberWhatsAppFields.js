const memberWhatsAppFields = {
  whatsappOptIn: {
    type: Boolean,
    default: false,
  },
  whatsappOptInDate: {
    type: Date,
    default: null,
  },
  whatsappOptOutDate: {
    type: Date,
    default: null,
  },
  firstTimer: {
    type: Boolean,
    default: false,
  },
  firstVisitDate: {
    type: Date,
    default: null,
  },
  whatsappConversationStage: {
    type: String,
    enum: [
      'none',
      'welcome_sent',
      'awaiting_reply',
      'prayer_requested',
      'smallgroup_interested',
      'membership_interested',
      'escalated_to_human',
      'completed',
    ],
    default: 'none',
  },
  followUpStage: {
    type: Number,
    default: -1,
  },
  followUpStartDate: {
    type: Date,
    default: null,
  },
  lastWhatsappMessageSent: {
    type: Date,
    default: null,
  },
  lastWhatsappReply: {
    type: Date,
    default: null,
  },
  whatsappEngagementStatus: {
    type: String,
    enum: ['active', 'inactive', 'unresponsive', 'new'],
    default: 'new',
  },
  totalMessagesSent: {
    type: Number,
    default: 0,
  },
  totalReplies: {
    type: Number,
    default: 0,
  },
};

module.exports = memberWhatsAppFields;
