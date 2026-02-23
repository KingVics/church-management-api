const mongoose = require('mongoose');

const followUpJourneySchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Members',
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      required: true,
    },
    currentStage: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'escalated', 'opted_out'],
      default: 'active',
    },
    messagesSent: [
      {
        stage: Number,
        sentAt: Date,
        messageType: String,
      },
    ],
    replies: [
      {
        content: String,
        receivedAt: Date,
        stage: Number,
        action: String,
      },
    ],
    startedAt: {
      type: Date,
      default: Date.now,
    },
    nextMessageAt: {
      type: Date,
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Members',
      default: null,
    },
    escalationNotes: {
      type: String,
      default: null,
    },
    engagementScore: {
      type: String,
      enum: ['high', 'medium', 'low', 'none'],
      default: 'none',
    },
  },
  { timestamps: true }
);

followUpJourneySchema.index({ status: 1, nextMessageAt: 1 });
followUpJourneySchema.index({ memberId: 1 });
followUpJourneySchema.index({ currentStage: 1, status: 1 });

module.exports = mongoose.model('FollowUpJourney', followUpJourneySchema);
