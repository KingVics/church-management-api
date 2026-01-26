const NotificationTokenSchema = require('../model/notificationToken');

const SaveNotification = async ({ user, deviceToken }) => {
  try {
    // Validate device token
    if (!deviceToken || deviceToken.length < 3) return;

    // Check existing notification tokens for the user
    const existingTokens = await NotificationTokenSchema.find({
      userId: user._id,
    });

    if (!existingTokens || existingTokens.length === 0) {
      // Create a new entry if no tokens exist
      await NotificationTokenSchema.create({
        userId: user._id,
        token: deviceToken,
        role: user?.permission?.length > 0 ? 'admin' : 'user',
      });
    } else {
      // Check if the token already exists
      const tokenExists = existingTokens.some(
        (entry) => entry.token === deviceToken
      );
      if (tokenExists) return;

      // Update token if it's new
      await NotificationTokenSchema.findOneAndUpdate(
        { userId: user._id },
        { token: deviceToken },
        { new: true }
      );
    }
  } catch (error) {
    throw new Error('Failed to save notification token');
  }
};

module.exports = SaveNotification;
