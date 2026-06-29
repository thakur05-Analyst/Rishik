const nodemailer = require('nodemailer');
const { logger } = require('./logger');

let transporter;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} else {
  logger.warn('EMAIL_USER and EMAIL_PASS environment variables are missing. Mail service will run in mock mode.');
}

async function sendEmailNotification(data) {
  const { name, email, phone, company, service, message, ip } = data;
  const formattedDate = new Date().toLocaleString('en-US', { timeZoneName: 'short' });
  
  const emailSubject = 'New Portfolio Enquiry';
  const emailBody = `
You have received a new enquiry from your portfolio website.

Name: ${name}
Email: ${email}
Phone: ${phone || 'N/A'}
Company: ${company || 'N/A'}
Service Required: ${service || 'N/A'}

Message:
${message}

Date & Time: ${formattedDate}
User IP: ${ip}
  `.trim();

  if (transporter) {
    logger.info(`Dispatching admin notification mail to ${process.env.EMAIL_USER}...`);
    return transporter.sendMail({
      from: `"${name}" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: emailSubject,
      text: emailBody
    });
  } else {
    logger.info(`[MOCK EMAIL] TO: ADMIN | SUBJECT: ${emailSubject}`);
    return Promise.resolve();
  }
}

async function sendAutoReply(data) {
  const { email, name } = data;
  const replySubject = 'Thank you for your enquiry';
  const replyBody = `
Thank you for contacting Thakur Rishik Singh.

I have received your enquiry and will contact you as soon as possible.

Regards,
Thakur Rishik Singh
Phone: +91 9640929350
  `.trim();

  if (transporter) {
    logger.info(`Dispatching auto-reply mail to ${email}...`);
    return transporter.sendMail({
      from: `"Thakur Rishik Singh" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: replySubject,
      text: replyBody
    });
  } else {
    logger.info(`[MOCK EMAIL] TO: ${email} | SUBJECT: ${replySubject}`);
    return Promise.resolve();
  }
}

module.exports = {
  sendEmailNotification,
  sendAutoReply
};
