const cron = require('node-cron');
const followUpService = require('../services/followUpService');

const registerWhatsAppCronJobs = () => {
  cron.schedule(
    '0 * * * *',
    async () => {
      try {
        await followUpService.ensureDefaultFlowConfig();
        await followUpService.processScheduledMessages();
      } catch (error) {
        console.error('[Cron] Follow-up processing error:', error.message);
      }
    },
    { scheduled: true }
  );
};

module.exports = { registerWhatsAppCronJobs };
