const mongoose = require('mongoose');

const CallLog = mongoose.Schema({
  adminId: {
    type: mongoose.Types.ObjectId,
    ref: 'Adminstrator',
    required: [true, 'adminId is required'],
  },
  adminName: { type: String, required: true },
  absentDate: {
    type: String,
    required: true,
  },
  callTimestamp: { type: Date },
  memberId: {
    type: mongoose.Types.ObjectId,
    ref: 'Adminstrator',
    required: [true, 'memberId is required'],
  },
  memberName: { type: String, required: true },
  phone: {
    type: String,
    required: [true, 'phone number is required'],
  },
  activityId: {
    type: mongoose.Types.ObjectId,
    required: [true, 'phone number is required'],
    ref: 'Activities',
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed'],
  },
  assignedDate: {
    type: Date,
    default: new Date(),
  },
  gender: String,
  updateStatus: {
    type: Boolean,
    default: false,
  },
  absenceCount: String,
  absentActivities: [],
  membershipType: String,
});

module.exports = mongoose.model('CallLog', CallLog);
