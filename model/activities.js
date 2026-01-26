const mongoose = require('mongoose');

const Activities = mongoose.Schema(
  {
    date: {
      type: String,
      validate: {
        validator: function (v) {
          return /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/.test(v);
        },
        message: (props) =>
          `${props.value} is not a valid date, please enter MM/DD/YYYY.`,
      },
      required: [true, 'Please provide service date'],
      unique: true,
    },
    createdBy: {
      type: String,
      ref: 'admin',
      required: [true, 'Createdby is missing'],
    },
    serviceName: {
      type: String,
      required: [true, 'Service name is required.'],
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Activities', Activities);
