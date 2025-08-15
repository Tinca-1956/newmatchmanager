'use server';

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';

// NOTE: This is a basic text-based email template.
// For more advanced emails, you would create React components for the email body.
const createVerificationEmailBody = (name: string, verificationLink: string): string => {
  return `
    Hello ${name},

    Thank you for registering for Match Manager!

    Please click the link below to verify your email address and activate your account:
    ${verificationLink}

    If you did not sign up for this account, you can ignore this email.

    Thanks,
    The Match Manager Team
  `;
};

const createTestEmailBody = (name: string): string => {
  return `
    Hello ${name},

    This is a test email from the Match Manager application.
    
    If you received this, your Resend integration is working correctly!

    Thanks,
    The Match Manager Team
  `;
};

const createWelcomeEmailBody = (name: string, clubName: string, role: string, status: string): string => {
  return `
    Hello ${name},

    Welcome to Match Manager!

    Your profile has been successfully created with the following details:
    
    Primary Club: ${clubName}
    Your Role: ${role}
    Membership Status: ${status}

    You can now log in to the dashboard to view matches and manage your profile.
    If your status is 'Pending', a club administrator will review your application soon.

    Thanks,
    The Match Manager Team
  `;
}

const createContactAdminEmailBody = (message: string, fromUserEmail: string): string => {
  return `
    You have received a new message from a club member.

    From: ${fromUserEmail}
    --------------------------------
    Message:
    
    ${message}
    --------------------------------

    You can reply directly to the user at their email address.
  `;
}

const createMatchRegistrationConfirmationEmailBody = (
  anglerFirstName: string,
  clubName: string,
  seriesName: string,
  matchName: string,
  location: string,
  date: string,
  registeredCount: number,
  drawTime: string,
  description?: string,
): string => {
  let emailBody = `
Dear ${anglerFirstName},

Thank you for registering for the ${clubName} match: ${seriesName}, ${matchName} at ${location} on ${date}.

There are now ${registeredCount} anglers registered for this match.

We look forward to seeing you on the bank at ${drawTime} for the draw and briefing.

Don't forget to check the 'Description' field in the MATCHES page for full details about the peg fees, pool fees, rules and general information.

Warmest regards,
MATCH MANAGER.
Match secretary, ${clubName}
  `;

  if (description) {
    emailBody += `
---
MATCH INFORMATION
---
${description}
`;
  }

  return emailBody;
};


export const sendVerificationEmail = async (email: string, name: string, verificationLink: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: `Match Manager <${fromEmail}>`,
      to: [email],
      subject: 'Verify Your Email Address for Match Manager',
      text: createVerificationEmailBody(name, verificationLink),
      // If you want to use a React component for your email:
      // react: EmailTemplate({ firstName: name, verificationLink }),
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send verification email.');
    }

    return data;
  } catch (error) {
    console.error('Error in sendVerificationEmail:', error);
    throw error;
  }
};

export const sendTestEmail = async (email: string, name: string) => {
    try {
        const { data, error } = await resend.emails.send({
            from: `Match Manager <${fromEmail}>`,
            to: [email],
            subject: 'Match Manager Test Email',
            text: createTestEmailBody(name),
        });

        if (error) {
            console.error('Resend error:', error);
            throw new Error('Failed to send test email.');
        }
        return data;
    } catch (error) {
        console.error('Error in sendTestEmail:', error);
        throw error;
    }
};

export const sendWelcomeEmail = async (email: string, name: string, clubName: string, role: string, status: string, ccEmails: string[] = []) => {
    try {
        const { data, error } = await resend.emails.send({
            from: `Match Manager <${fromEmail}>`,
            to: [email],
            cc: ccEmails,
            subject: 'Welcome to Match Manager!',
            text: createWelcomeEmailBody(name, clubName, role, status),
        });

        if (error) {
            console.error('Resend error:', error);
            throw new Error('Failed to send welcome email.');
        }
        return data;
    } catch (error) {
        console.error('Error in sendWelcomeEmail:', error);
        throw error;
    }
}

export const sendContactEmailToClubAdmins = async (toEmail: string, subject: string, message: string, fromUserEmail: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: `Match Manager <${fromEmail}>`,
      to: [toEmail],
      reply_to: fromUserEmail,
      subject: `[Match Manager Contact] ${subject}`,
      text: createContactAdminEmailBody(message, fromUserEmail),
    });

     if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send contact email.');
    }
    return data;

  } catch (error) {
    console.error('Error in sendContactEmailToClubAdmins:', error);
    throw error;
  }
};

export const sendMatchRegistrationConfirmationEmail = async (
  email: string,
  anglerFirstName: string,
  clubName: string,
  seriesName: string,
  matchName: string,
  location: string,
  date: string,
  registeredCount: number,
  drawTime: string,
  ccEmails: string[] = [],
  description?: string
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: `Match Manager <${fromEmail}>`,
      to: [email],
      cc: ccEmails,
      subject: 'Confirmation of Registration',
      text: createMatchRegistrationConfirmationEmailBody(
        anglerFirstName,
        clubName,
        seriesName,
        matchName,
        location,
        date,
        registeredCount,
        drawTime,
        description
      ),
    });
    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send registration confirmation email.');
    }
    return data;
  } catch (error) {
    console.error('Error in sendMatchRegistrationConfirmationEmail:', error);
    throw error;
  }
};
