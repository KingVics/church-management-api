const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const Admin = mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please provide a firstName'],
    maxlength: 50,
    trim: true,
  },
  lastName: {
    type: String,
    required: [true, 'Please provide a lastName'],
    maxlength: 50,
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    minLength: 11,
    maxLength: 11,
    unique: true,
    match: [
      /^(?:(?:(?:\+?234(?:\h1)?|01)\h*)?(?:\(\d{3}\)|\d{3})|\d{4})(?:\W*\d{3})?\W*\d{4}$/gm,
      'Please provide a phone number e.g 09012345678',
    ],
  },
  gender: {
    type: String,
    required: [true, 'Please provide gender'],
    enum: ['Male', 'Female'],
  },
  email: {
    type: String,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please provide a valid email',
    ],
    lowercase: true,
    required: [true, 'Please provide email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: 6,
  },
  role: {
    type: String,
    default: 'Admin',
    enum: ['Admin', 'SuperAdmin', 'User'],
  },
  refreshToken: {
    type: String,
  },
});

Admin.pre('save', async function (next) {
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

Admin.methods.CreateJWT = function () {
  return jwt.sign(
    { userId: this._id, name: this.firstName, role: this.permission },
    process.env.JWT_SECRET,
    {
      expiresIn: '1d',
    }
  );
};

Admin.methods.RefreshJWT = function () {
  return jwt.sign(
    { userId: this._id, name: this.firstName, role: this.permission },
    'ACCESS_TOKEN',
    {
      expiresIn: '7d',
    }
  );
};
Admin.methods.comparePassword = async function (canditatePassword) {
  const isMatch = await bcrypt.compare(canditatePassword, this.password);
  return isMatch;
};

Admin.methods.saltPassword = async function (password) {
  const salt = await bcrypt.genSalt(10);
  const newPassword = await bcrypt.hash(password, salt);

  return newPassword;
};

module.exports = mongoose.model('Admin', Admin);
