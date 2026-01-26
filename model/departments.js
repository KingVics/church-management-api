const mongoose = require('mongoose');

const Departments = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide name of department'],
      maxlength: 50,
      unique: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'admin',
      required: [true, 'Please provide a user'],
    },
    headOfDepartment: {
      type: {
        name: String,
        userId: {
          type: mongoose.Types.ObjectId,
          ref: 'Member',
        },
        _id: false,
      },
      // required: [true, 'Please provide head of department'],
    },
    headOfDepartmentPhone: {
      type: String,
      minLength: 11,
      maxLength: 11,
      unique: true,
      match: [
        /^(?:(?:(?:\+?234(?:\h1)?|01)\h*)?(?:\(\d{3}\)|\d{3})|\d{4})(?:\W*\d{3})?\W*\d{4}$/gm,
        'Please provide a phone number e.g 09012345678',
      ],
      lowercase: true,
      // required: [true, 'Please provide head of department phone number'],
    },
    ministerInCharge: {
      type: {
        name: String,
        userId: {
          type: mongoose.Types.ObjectId,
          ref: 'Member',
        },
        _id: false,
      },
    },
    modifiedBy: {
      type: String,
      ref: 'admin',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Departments', Departments);
