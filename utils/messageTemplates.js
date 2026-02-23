/**
 * WhatsApp message templates.
 */
const templates = {
  welcome: (firstName, churchName = 'Victory Chapel') =>
    `Hello ${firstName}!\nWelcome to ${churchName}!\nWe're glad you worshipped with us.\n\nReply:\n1 - Prayer Request\n2 - Small Group Info\n3 - Membership Info`,

  communityLink: (groupLink, churchName = 'Victory Chapel') =>
    `Join our ${churchName} community:\n${groupLink}\n\nStay connected with us for updates, prayers, and encouragement!`,

  followUpDay2: (firstName) =>
    `Hi ${firstName},\nWe're praying for you this week.\nIs there anything specific you'd like us to pray about?\n\nFeel free to share, or reply:\n1 - Yes, I have a prayer request\n2 - No, just keep me in your prayers`,

  followUpDay4: (firstName) =>
    `Hi ${firstName},\nOne of the best ways to grow in faith is through community.\nWe'd love to connect you with a small group near you!\n\nReply:\n1 - I'm interested in joining a small group\n2 - Maybe later\n3 - Tell me more`,

  followUpDay7: (firstName, pastorName = 'our pastoral team') =>
    `Hi ${firstName},\nWe hope you've been blessed this week!\n${pastorName} would love to connect with you personally.\n\nWould you be open to a brief call or visit?\nReply:\n1 - Yes, please\n2 - Not right now`,

  prayerRequestAck: (firstName) =>
    `Thank you ${firstName}.\nYour prayer request has been received.\nOur prayer team is lifting you up in prayer.\nGod bless you!`,

  smallGroupInfo: (firstName, groups = []) => {
    let msg = `Great news ${firstName}!\nHere are our available small groups:\n\n`;
    if (groups.length > 0) {
      groups.forEach((g, i) => {
        msg += `${i + 1}. ${g.name} - ${g.day} at ${g.time}\n`;
        if (g.location) msg += `   ${g.location}\n`;
      });
      return msg;
    }
    return (
      msg +
      `We'll connect you with the right group soon.\nA team member will reach out to you shortly.`
    );
  },

  membershipInfo: (firstName, classDate = null) => {
    let msg = `Welcome ${firstName}!\nWe're excited about your interest in membership!\n\n`;
    if (classDate) {
      msg += `Our next membership class is on ${classDate}.\n`;
    } else {
      msg += `We'll notify you about our next membership class.\n`;
    }
    msg += 'A coordinator will reach out with more details soon.';
    return msg;
  },

  sundayReminder: (churchName = 'Victory Chapel', serviceTime = '9:00 AM') =>
    `See you tomorrow!\n\nJoin us at ${churchName} for worship.\nService starts at ${serviceTime}\n\nBring a friend!`,

  eventUpdate: (eventName, date, time, venue = '') => {
    let msg = `Event Update\n\n*${eventName}*\n${date}\n${time}\n`;
    if (venue) msg += `${venue}\n`;
    msg += '\nWe look forward to seeing you there!';
    return msg;
  },

  emergency: (message, churchName = 'Victory Chapel') =>
    `Important Notice from ${churchName}\n\n${message}`,

  absentReminder: (firstName, weeksMissed = 1) => {
    const weekText =
      weeksMissed === 1 ? 'last week' : `the last ${weeksMissed} weeks`;
    return `Hi ${firstName},\nWe missed you ${weekText}!\nJust checking in, hope you're doing well.\n\nIs everything okay?\nReply:\n1 - I'm fine, will be back soon\n2 - I need prayer/support\n3 - Please call me`;
  },
};

module.exports = templates;
