const mongoose = require('mongoose');

const flowStageSchema = new mongoose.Schema(
  {
    stage: {
      type: Number,
      min: 0,
      required: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    message: {
      type: String,
      default: '',
    },
    delayToNextDays: {
      type: Number,
      default: null,
    },
    sendHour: {
      type: Number,
      min: 0,
      max: 23,
      default: 10,
    },
    sendMinute: {
      type: Number,
      min: 0,
      max: 59,
      default: 0,
    },
    responseOptions: {
      type: [
        new mongoose.Schema(
          {
            code: { type: String, required: true, trim: true },
            matches: { type: [String], default: [] },
            responseMessage: { type: String, default: '' },
            conversationStage: { type: String, default: null },
            journeyStatus: {
              type: String,
              enum: ['active', 'completed', 'paused', 'escalated', 'opted_out', null],
              default: null,
            },
            escalationNotes: { type: String, default: null },
            nextStageOverride: { type: Number, min: 0, default: null },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
  },
  { _id: false }
);

const responseOptionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    matches: { type: [String], default: [] },
    responseMessage: { type: String, default: '' },
    conversationStage: { type: String, default: null },
    journeyStatus: {
      type: String,
      enum: ['active', 'completed', 'paused', 'escalated', 'opted_out', null],
      default: null,
    },
    escalationNotes: { type: String, default: null },
    nextStageOverride: { type: Number, min: 0, default: null },
  },
  { _id: false }
);

const absentReminderSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    messageTemplate: { type: String, default: '' },
    responseOptions: {
      type: [responseOptionSchema],
      default: [],
    },
  },
  { _id: false }
);

const followUpFlowConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'Default Follow-up Flow',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    stages: {
      type: [flowStageSchema],
      default: [],
      validate: {
        validator: function (stages) {
          if (!Array.isArray(stages) || stages.length === 0) return false;

          const seenStages = new Set();
          const seenKeys = new Set();
          let enabledCount = 0;

          for (const stage of stages) {
            if (!Number.isInteger(stage.stage) || stage.stage < 0) {
              return false;
            }
            if (seenStages.has(stage.stage)) return false;
            seenStages.add(stage.stage);

            if (typeof stage.key !== 'string' || !stage.key.trim()) return false;
            if (seenKeys.has(stage.key)) return false;
            seenKeys.add(stage.key);

            if (typeof stage.enabled !== 'boolean') return false;
            if (stage.enabled) enabledCount++;
            if (
              typeof stage.sendHour !== 'number' ||
              stage.sendHour < 0 ||
              stage.sendHour > 23
            ) {
              return false;
            }
            if (
              typeof stage.sendMinute !== 'number' ||
              stage.sendMinute < 0 ||
              stage.sendMinute > 59
            ) {
              return false;
            }
            if (
              stage.delayToNextDays !== null &&
              (typeof stage.delayToNextDays !== 'number' ||
                stage.delayToNextDays < 0)
            ) {
              return false;
            }
          }

          return enabledCount > 0;
        },
        message:
          'Invalid follow-up flow stages. Stage values and keys must be unique, timing must be valid, and at least one stage must be enabled.',
      },
    },
    absentReminder: {
      type: absentReminderSchema,
      default: () => ({
        enabled: true,
        messageTemplate: '',
        responseOptions: [],
      }),
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Members',
      default: null,
    },
  },
  { timestamps: true }
);

followUpFlowConfigSchema.index({ isActive: 1 });

followUpFlowConfigSchema.pre('save', function (next) {
  if (Array.isArray(this.stages)) {
    this.stages = [...this.stages].sort((a, b) => a.stage - b.stage);
  }
  next();
});

module.exports = mongoose.model('FollowUpFlowConfig', followUpFlowConfigSchema);
