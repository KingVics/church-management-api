const mongoose = require('mongoose');

var attendanceSchema = mongoose.Schema({
  date: String,
  serviceName: String,
  serviceId: mongoose.Schema.Types.ObjectId,
  time: String,
  attendance: {
    type: String,
    enum: ['Present', 'Absent'],
    default: 'Absent',
  },
  _id: false,
});

var departmentSchema = mongoose.Schema({
  deptId: mongoose.Types.ObjectId,
  name: String,
  _id: false,
});
const Archive = mongoose.Schema(
  {
    title: {
      type: String,
    },
    userId: {
      type: mongoose.Types.ObjectId,
      required: [true, 'UserId'],
      ref: 'Members',
      unique: true,
    },
    profilePicture: {
      type: String,
    },
    firstName: {
      type: String,
      required: [true, 'Please provide a first name'],
      maxlength: 50,
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Please provide a last name'],
      maxlength: 50,
      trim: true,
    },
    gender: {
      type: String,
    },
    phone: {
      type: String,
    },
    category: {
      type: String,
    },
    maritalStatus: {
      type: String,
    },
    spouseName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
    },
    address: {
      type: String,
    },
    departments: [departmentSchema],
    membershipType: {
      type: String,
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
    dateOfBirth: {
      type: String,
    },
    attendance: [attendanceSchema],
    memberId: {
      type: String,
    },
    permission: [{}],
    password: {
      type: String,
    },
    refreshToken: {
      type: String,
    },
    createdBy: String,
  },

  { timestamps: true }
);

module.exports = mongoose.model('Archive', Archive);
