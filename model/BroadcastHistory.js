const mongoose = require('mongoose');

const broadcastHistorySchema = new mongoose.Schema(
  {
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Members',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'sunday_reminder',
        'event_update',
        'emergency',
        'custom',
        'absent_reminder',
      ],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    audience: {
      type: String,
      enum: ['all_opted_in', 'department', 'custom_list', 'absent_members'],
      default: 'all_opted_in',
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Departments',
      default: null,
    },
    totalRecipients: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failCount: {
      type: Number,
      default: 0,
    },
    recipients: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Members',
        },
        phone: String,
        status: {
          type: String,
          enum: ['queued', 'sent', 'delivered', 'failed'],
          default: 'queued',
        },
        sentAt: Date,
        error: String,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

broadcastHistorySchema.index({ sentBy: 1, createdAt: -1 });
broadcastHistorySchema.index({ status: 1 });
broadcastHistorySchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('BroadcastHistory', broadcastHistorySchema);
