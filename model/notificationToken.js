const mongoose = require('mongoose');

const Notification = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Members',
      required: [true, 'UserId is missing'],
    },
    token: {
      type: String,
      required: [true, 'Token is missing'],
    },
    role: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', Notification);
