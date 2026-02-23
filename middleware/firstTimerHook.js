const followUpService = require('../services/followUpService');

const triggerFirstTimerWelcome = async (member) => {
  try {
    if (!member.firstTimer || !member.phone) {
      return null;
    }

    const journey = await followUpService.startJourney(member);

    member.followUpStage = 0;
    member.whatsappConversationStage = 'welcome_sent';
    member.followUpStartDate = new Date();
    member.lastWhatsappMessageSent = new Date();
    await member.save();

    return journey;
  } catch (error) {
    console.error(`[FirstTimer] Auto-welcome failed: ${error.message}`);
    return null;
  }
};

module.exports = { triggerFirstTimerWelcome };
