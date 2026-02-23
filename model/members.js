// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');

// var attendanceSchema = mongoose.Schema({
//   date: String,
//   serviceName: String,
//   serviceId: mongoose.Schema.Types.ObjectId,
//   time: String,
//   attendance: {
//     type: String,
//     enum: ['Present', 'Absent'],
//     default: 'Absent',
//   },
//   createdBy: String,
//   _id: false,
// });

// var departmentSchema = mongoose.Schema({
//   deptId: mongoose.Types.ObjectId,
//   name: String,
//   _id: false,
// });
// const Members = mongoose.Schema(
//   {
//     title: {
//       type: String,
//       enum: ['Pastor', 'Mr', 'Miss', 'Mrs', 'Dcn', 'Asst. Pastor', 'Elder'],
//     },
//     profilePicture: {
//       type: String,
//     },
//     firstName: {
//       type: String,
//       required: [true, 'Please provide a first name'],
//       maxlength: 50,
//       trim: true,
//     },
//     lastName: {
//       type: String,
//       required: [true, 'Please provide a last name'],
//       maxlength: 50,
//       trim: true,
//     },
//     gender: {
//       type: String,
//       enum: ['Male', 'Female'],
//       required: [true, 'Please select a gender'],
//     },
//     phone: {
//       type: String,
//       minLength: 11,
//       maxLength: 11,
//       match: [
//         /^(?:(?:(?:\+?234(?:\h1)?|01)\h*)?(?:\(\d{3}\)|\d{3})|\d{4})(?:\W*\d{3})?\W*\d{4}$/gm,
//         'Please provide a phone number e.g 09012345678',
//       ],
//     },
//     category: {
//       type: String,
//       enum: ['Adult', 'Teen', 'Children'],
//       required: [true, 'Select Category'],
//     },
//     maritalStatus: {
//       type: String,
//       enum: ['Married', 'Single', 'Divorce'],
//     },
//     spouseName: {
//       type: String,
//       trim: true,
//     },
//     email: {
//       type: String,
//       match: [
//         /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
//         'Please provide a valid email',
//       ],
//       lowercase: true,
//     },
//     address: {
//       type: String,
//       // required: [true, 'Please enter an address'],
//       maxlength: 100,
//       trim: true,
//     },
//     departments: [departmentSchema],
//     membershipType: {
//       type: String,
//       enum: ['Existing Member', 'New Member', 'Visitor'],
//     },
//     joinedDate: {
//       type: Date,
//       default: Date.now,
//     },
//     dateOfBirth: {
//       type: String,
//       validate: {
//         validator: function (v) {
//           return /^\d{2}-\d{2}$/.test(v);
//         },
//         message: (props) =>
//           `${props.value} is not a valid date, please enter MM/DD.`,
//       },
//       // required: [true, 'Please provide a valid date of birth'],
//     },
//     attendance: [attendanceSchema],
//     memberId: {
//       type: String,
//       required: [true, 'No member Id found'],
//       unique: true,
//     },
//     permission: [
//       {
//         name: {
//           type: String,
//         },
//         permId: {
//           type: mongoose.Types.ObjectId,
//           ref: 'Permission',
//         },
//         permissions: [],
//         _id: false,
//       },
//     ],
//     password: {
//       type: String,
//     },
//     refreshToken: {
//       type: String,
//     },
//     updatedBy: String,
//   },

//   { timestamps: true }
// );

// // Members.pre('save', async function (next) {
// //   const salt = await bcrypt.genSalt(10);
// //   this.password = await bcrypt.hash(this.password, salt);

// //   next();
// // });

// Members.methods.CreateJWT = function () {
//   return jwt.sign(
//     { userId: this._id, name: this.firstName, role: this.permission },
//     process.env.JWT_SECRET,
//     {
//       expiresIn: '1d',
//     }
//   );
// };

// Members.methods.RefreshJWT = function () {
//   return jwt.sign(
//     { userId: this._id, name: this.firstName, role: this.permission },
//     process.env.REFRESH_TOKEN,
//     {
//       expiresIn: '7d',
//     }
//   );
// };
// Members.methods.comparePassword = async function (canditatePassword) {
//   const isMatch = await bcrypt.compare(canditatePassword, this.password);
//   return isMatch;
// };

// Members.methods.saltPassword = async function (password) {
//   const salt = await bcrypt.genSalt(10);
//   const newPassword = await bcrypt.hash(password, salt);
//   return newPassword;
// };

// module.exports = mongoose.model('Members', Members);

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const memberWhatsAppFields = require('./MemberWhatsAppFields');

const attendanceSchema = new mongoose.Schema(
  {
    date: String,
    serviceName: String,
    serviceId: mongoose.Schema.Types.ObjectId,
    time: String,
    attendance: {
      type: String,
      enum: ['Present', 'Absent'],
      default: 'Absent',
    },
    createdBy: String,
  },
  { _id: false }
);

const departmentSchema = new mongoose.Schema(
  {
    deptId: mongoose.Types.ObjectId,
    name: String,
  },
  { _id: false }
);

const MembersSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      enum: ['Pastor', 'Mr', 'Miss', 'Mrs', 'Dcn', 'Asst. Pastor', 'Elder'],
    },
    profilePicture: String,
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
      enum: ['Male', 'Female'],
      required: [true, 'Please select a gender'],
    },
    phone: {
      type: String,
      minLength: 11,
      maxLength: 11,
      match: [
        /^(?:(?:(?:\+?234(?:\h1)?|01)\h*)?(?:\(\d{3}\)|\d{3})|\d{4})(?:\W*\d{3})?\W*\d{4}$/gm,
        'Please provide a valid phone number e.g 09012345678',
      ],
    },
    category: {
      type: String,
      enum: ['Adult', 'Teen', 'Children'],
      required: [true, 'Select Category'],
    },
    maritalStatus: {
      type: String,
      enum: ['Married', 'Single', 'Divorce'],
    },
    spouseName: { type: String, trim: true },
    email: {
      type: String,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please provide a valid email',
      ],
      lowercase: true,
    },
    address: {
      type: String,
      maxlength: 100,
      trim: true,
    },
    departments: [departmentSchema],
    membershipType: {
      type: String,
      enum: ['Existing Member', 'New Member', 'Visitor'],
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
    dateOfBirth: {
      type: String,
      validate: {
        validator: function (v) {
          return /^\d{2}[-/]\d{2}$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid date, please enter MM-DD or MM/DD.`,
      },
    },
    attendance: [attendanceSchema],
    memberId: {
      type: String,
      required: [true, 'No member Id found'],
      unique: true,
    },
    permission: [
      {
        name: String,
        permId: {
          type: mongoose.Types.ObjectId,
          ref: 'Permission',
        },
        permissions: [],
      },
    ],
    password: String,
    refreshToken: String,
    ...memberWhatsAppFields,
    updatedBy: String,
  },
  { timestamps: true }
);

// 🔐 Hash password before saving
MembersSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔑 Generate JWT token
MembersSchema.methods.CreateJWT = function () {
  return jwt.sign(
    { userId: this._id, name: this.firstName, role: this.permission },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );
};

// 🔄 Generate Refresh Token
MembersSchema.methods.RefreshJWT = function () {
  return jwt.sign(
    { userId: this._id, name: this.firstName, role: this.permission },
    process.env.REFRESH_TOKEN,
    {
      expiresIn: '1h',
    }
  );
};

// 🔐 Compare password
MembersSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 🔑 Hash a given password (useful for password resets)
MembersSchema.methods.saltPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// 🔍 Ensure `memberId` is unique
MembersSchema.index({ memberId: 1 }, { unique: true });

module.exports = mongoose.model('Members', MembersSchema);
