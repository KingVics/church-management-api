const { NotFoundError, UnauthenticatedError } = require('../errors');
const { StatusCodes } = require('http-status-codes');
const User = require('../model/members');
const jwt = require('jsonwebtoken');

const RefreshToken = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      throw new UnauthenticatedError('Unauthorized access');
    }

    const user = await User.findOne({ _id: userId });

    if (!user) {
      throw new UnauthenticatedError('Invalid email or password');
    }

    const refreshToken = user.refreshToken;

    if (!refreshToken) {
      throw new NotFoundError('No refresh token found, please log in again');
    }

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN,
      async (err, decoded) => {
        if (err || user.firstName !== decoded.name) {
          // Refresh token is invalid or expired -> Issue new refresh token
          const newRefreshToken = user.RefreshJWT();
          await User.findByIdAndUpdate(
            user._id,
            { refreshToken: newRefreshToken },
            { new: true }
          );

          // Generate new access token
          const token = jwt.sign(
            {
              userId: user._id, // Ensure _id is used
              name: user.firstName,
              role: user.permission,
            },
            process.env.JWT_SECRET,
            { expiresIn: '20m' }
          );

          // Set new refresh token in a secure cookie
          res.cookie('jwt', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Secure in production
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
          });

          return res.status(StatusCodes.CREATED).json({
            name: user.firstName,
            token,
            userId: user._id,
            role: user?.permission,
          });
        }

        // If refresh token is valid, generate new access token
        const token = jwt.sign(
          {
            userId: user._id,
            name: user.firstName,
            role: user.permission,
          },
          process.env.JWT_SECRET,
          { expiresIn: '20m' }
        );

        res.status(StatusCodes.CREATED).json({
          name: user.firstName,
          token,
          userId: user._id,
          role: user?.permission,
        });
      }
    );
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

module.exports = RefreshToken;
