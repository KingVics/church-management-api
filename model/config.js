const mongoose = require('mongoose');
var perm = mongoose.Schema({
  name: String,
  _id: false,
});
const Permission = mongoose.Schema({
  name: {
    type: String,
    required: [true, 'role name is required'],
    unique: true,
  },
  permissions: [perm],
});

module.exports = mongoose.model('Permission', Permission);
