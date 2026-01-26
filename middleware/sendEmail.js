const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SendEmail = async ({ msg }) => {
  try {
    return await sgMail.send(msg)
  } catch (error) {
    console.error(error?.response?.body);
  }
};

module.exports = SendEmail;
