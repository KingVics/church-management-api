// middleware/rbacMiddleware.js

const Permissions = require('../config/permission');

// Check if the user has the required permission for a route
exports.checkPermission = (role, permission) => {
  return async (req, res, next) => {
    const userRole = req.user ? req.user.role : 'anonymous';
    const userPermissions = await new Permissions().getPermissionsByRoleName(
      userRole,
      role,
      permission
    );

    console.log(userPermissions, 'userPermissions', req.user);

    if (userPermissions?.permissions?.find((c) => c.name === permission)) {
      return next();
    } else {
      return res
        .status(403)
        .json({ error: 'Access denied. Contact admin for permission.' });
    }
  };
};
