const jwt = require('jsonwebtoken');
const { UnauthenticatedError } = require('../errors');

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthenticatedError('Unauthorized access');
  }

  const bearer = authHeader.split(' ')[1];
  try {
    const token = jwt.verify(bearer, process.env.JWT_SECRET);

    req.user = {
      userId: token.userId,
      name: token.name,
      role: token.role,
    };
    next();
  } catch (error) {
    throw new UnauthenticatedError('Unauthorized access');
  }
};

module.exports = auth;
