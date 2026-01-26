const mongoose = require('mongoose');
var note = mongoose.Schema(
  {
    createdBy: {
      name: String,
      userId: {
        type: mongoose.Types.ObjectId,
        ref: 'Members',
      },
    },
    comment: String,
    date: String,
  },
  { timestamps: true }
);

const Note = mongoose.Schema({
  memberId: {
    type: mongoose.Types.ObjectId,
    ref: 'Members',
  },
  notes: [note],
});

module.exports = mongoose.model('Note', Note);
