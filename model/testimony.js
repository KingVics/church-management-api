const mongoose = require('mongoose');

const Testimony = mongoose.Schema(
  {
    name: {
      type: String,
      maxLength: 50,
    },
    phone: {
      type: String,
      maxLength: 11,
      match: [
        /^(?:(?:(?:\+?234(?:\h1)?|01)\h*)?(?:\(\d{3}\)|\d{3})|\d{4})(?:\W*\d{3})?\W*\d{4}$/gm,
        'Please provide a phone number e.g 09012345678',
      ],
    },
    testimony: {
      type: String,
    },
    audioSource: {
      type: String,
    },
    public: {
      type: Boolean,
      default: true,
    },
    media: [],
    date: {
      type: String,
      required: [true, 'System date is missing'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Testimony', Testimony);
