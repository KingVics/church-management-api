const { google } = require('googleapis');

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';
const CHANNEL_ID = process.env.CHANNEL_ID;
const REFRESH_TOKEN = process.env.YT_REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN,
});

/**
 * Checks if the refresh token is valid and returns a YouTube client.
 * Throws a detailed error if the token is invalid or revoked.
 */
const getYouTubeClientWithRetry = async () => {
  try {
    console.log('🔄 Attempting to refresh access token...');
    const { credentials } = await oAuth2Client.refreshAccessToken();

    oAuth2Client.setCredentials(credentials);

    console.log('✅ Token refreshed. Returning authenticated client.');
    return google.youtube({
      version: 'v3',
      auth: oAuth2Client,
    });
  } catch (error) {
    const message = error.response?.data?.error || error.message;

    if (message === 'invalid_grant') {
      console.error(
        '❌ Refresh token is expired or revoked. Manual re-auth needed.'
      );
      throw new Error(
        'Refresh token invalid or revoked. Please re-authenticate via the OAuth flow.'
      );
    }

    console.error('🔴 Token refresh failed:', message);
    throw new Error('Failed to refresh access token. ' + message);
  }
};

module.exports = {
  getYouTubeClientWithRetry,
  oAuth2Client,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI,
  CHANNEL_ID,
};
