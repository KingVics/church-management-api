const NotificationTokenSchema = require('../model/notificationToken');

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-adminsdk-fbsvc-7d3ce0a628.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const SendNotification = async ({ searchObject, title, body }) => {
  try {
    const userToken = await NotificationTokenSchema.find(searchObject);

    const tokens = userToken.map((doc) => doc.token);
    const message = {
      notification: {
        title,
        body,
      },
      tokens,
    };

    if (tokens && tokens.length > 0) {
      const messages = tokens.map((token) => ({
        token, 
        notification: {
          title,
          body,
        },
      }));

      const response = await admin.messaging().sendEach(messages);

      console.log(`${response.successCount} messages were sent successfully`);
    } else {
      console.log('No tokens provided.');
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

module.exports = SendNotification;
