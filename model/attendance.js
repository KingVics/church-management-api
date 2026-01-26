const mongoose = require('mongoose')



const Attendance = mongoose.Schema({
    amount: String,
    date: String,
    type: {
      type: String,
      enum: ['debit', 'credit'],
    },
    sendername: String,
  });

module.exports = Attendance