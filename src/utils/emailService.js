const nodemailer = require('nodemailer');
const db = require('../models/database');

class EmailService {
  constructor() {
    this.transporter = null;
    this.init();
  }

  init() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      console.warn('Email configuration not found. Email notifications will be disabled.');
    }
  }

  async sendEmail(to, subject, html, text) {
    if (!this.transporter) {
      console.log('Email service not configured. Would send:', { to, subject });
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${process.env.FROM_NAME || 'Digital Gift Table'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text
      });

      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendEventPublishedEmails(event) {
    if (!event.attendees || event.attendees.length === 0) {
      return;
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    for (const attendee of event.attendees) {
      const eventUrl = `${baseUrl}/event/${attendee.unique_token}`;
      
      const subject = `🎁 Gift Event: ${event.subject}`;
      const html = this.generateEventPublishedEmailHTML(event, attendee, eventUrl);
      const text = this.generateEventPublishedEmailText(event, attendee, eventUrl);

      await this.sendEmail(attendee.email, subject, html, text);
      
      // Log email notification
      await this.logEmailNotification(event.id, attendee.id, 'event_published');
    }
  }

  async sendNewGiftItemEmails(event, newGiftItem) {
    const attendees = await db.query(
      'SELECT * FROM attendees WHERE event_id = ?',
      [event.id]
    );

    if (!attendees || attendees.length === 0) {
      return;
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    for (const attendee of attendees) {
      const eventUrl = `${baseUrl}/event/${attendee.unique_token}`;
      
      const subject = `🎁 New Gift Added: ${event.subject}`;
      const html = this.generateNewGiftItemEmailHTML(event, attendee, newGiftItem, eventUrl);
      const text = this.generateNewGiftItemEmailText(event, attendee, newGiftItem, eventUrl);

      await this.sendEmail(attendee.email, subject, html, text);
      
      // Log email notification
      await this.logEmailNotification(event.id, attendee.id, 'new_gift_item');
    }
  }

  generateEventPublishedEmailHTML(event, attendee, eventUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Gift Event Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎁 Gift Event Invitation</h1>
          </div>
          
          <h2>Hello ${attendee.name}!</h2>
          
          <p>You've been invited to participate in a gift event for <strong>${event.gift_receiver_name}</strong>!</p>
          
          <h3>Event Details:</h3>
          <ul>
            <li><strong>Event:</strong> ${event.subject}</li>
            <li><strong>Gift Recipient:</strong> ${event.gift_receiver_name}</li>
            ${event.description ? `<li><strong>Description:</strong> ${event.description}</li>` : ''}
          </ul>
          
          <p>Click the button below to view the gift list and select items you'd like to contribute:</p>
          
          <a href="${eventUrl}" class="button">View Gift Event</a>
          
          <p>Or copy and paste this link into your browser:<br>
          <a href="${eventUrl}">${eventUrl}</a></p>
          
          <div class="footer">
            <p>This is an automated message from the Digital Gift Table system.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateEventPublishedEmailText(event, attendee, eventUrl) {
    return `
Gift Event Invitation

Hello ${attendee.name}!

You've been invited to participate in a gift event for ${event.gift_receiver_name}!

Event Details:
- Event: ${event.subject}
- Gift Recipient: ${event.gift_receiver_name}
${event.description ? `- Description: ${event.description}` : ''}

Click the link below to view the gift list and select items you'd like to contribute:
${eventUrl}

This is an automated message from the Digital Gift Table system.
    `;
  }

  generateNewGiftItemEmailHTML(event, attendee, newGiftItem, eventUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Gift Added</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .gift-item { background: #fff3cd; padding: 15px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #ffc107; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎁 New Gift Added!</h1>
          </div>
          
          <h2>Hello ${attendee.name}!</h2>
          
          <p>A new gift item has been added to the gift event for <strong>${event.gift_receiver_name}</strong>!</p>
          
          <div class="gift-item">
            <h3>${newGiftItem.name}</h3>
            ${newGiftItem.price ? `<p><strong>Price:</strong> €${newGiftItem.price}</p>` : ''}
            ${newGiftItem.store_urls && newGiftItem.store_urls.length > 0 ? `
              <p><strong>Available at:</strong></p>
              <ul>
                ${newGiftItem.store_urls.map(url => `<li><a href="${url}">${url}</a></li>`).join('')}
              </ul>
            ` : ''}
          </div>
          
          <p>Click the button below to view all available gifts and make your selections:</p>
          
          <a href="${eventUrl}" class="button">View Gift Event</a>
          
          <p>Or copy and paste this link into your browser:<br>
          <a href="${eventUrl}">${eventUrl}</a></p>
          
          <div class="footer">
            <p>This is an automated message from the Digital Gift Table system.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateNewGiftItemEmailText(event, attendee, newGiftItem, eventUrl) {
    return `
New Gift Added!

Hello ${attendee.name}!

A new gift item has been added to the gift event for ${event.gift_receiver_name}!

New Gift Item:
- Name: ${newGiftItem.name}
${newGiftItem.price ? `- Price: €${newGiftItem.price}` : ''}
${newGiftItem.store_urls && newGiftItem.store_urls.length > 0 ? `
- Available at: ${newGiftItem.store_urls.join(', ')}
` : ''}

Click the link below to view all available gifts and make your selections:
${eventUrl}

This is an automated message from the Digital Gift Table system.
    `;
  }

  async logEmailNotification(eventId, attendeeId, notificationType) {
    try {
      await db.run(
        'INSERT INTO email_notifications (event_id, attendee_id, notification_type) VALUES (?, ?, ?)',
        [eventId, attendeeId, notificationType]
      );
    } catch (error) {
      console.error('Error logging email notification:', error);
    }
  }
}

module.exports = new EmailService();
