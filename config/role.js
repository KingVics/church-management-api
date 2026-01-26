// models/role.js

const Roles = require('../model/config');

class Role {
  constructor() {
    this.roles = '';
  }

  async getRoleByName(name) {
    return await Roles.find({ name: name?.toUpperCase() });
  }

  async getRoles() {
    return await Roles.find({});
  }
}

module.exports = Role;
