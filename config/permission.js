// models/permissions.js

const Role = require('./role');

class Permissions {
  constructor() {
    this.permissions = [];
  }

  async getPermissionsByRoleName(roleName, role, permission) {
    const name = await new Role().getRoleByName(role);
    const result = roleName?.find(function (o1) {
      return name.some(function (o2) {
        return o1.name === o2.name;
      });
    });
    return result ? result : [];
  }
}
module.exports = Permissions;
