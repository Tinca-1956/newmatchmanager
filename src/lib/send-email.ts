
'use server';

import { Resend } from 'resend';
import type { PublicMatch, Result, Club, Match, MembershipStatus } from './types';
import { firestore } from './firebase-client';
import { collection, doc, getDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { headers } from 'next/headers';

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

const createStatusChangeEmailBody = (name: string, clubName: string, newStatus: string): string => {
  return `
    Hello ${name},

    This is a notification from Match Manager.

    Your membership status for the club "${clubName}" has been updated to: ${newStatus}.

    If you have any questions, please contact your club administrator.

    Thanks,
    The Match Manager Team
  `;
}

const createBlogPostEmailBody = (blogSubject: string, clubName: string, link: string): string => {
    return `
      A new blog post has been published in your club, ${clubName}.

      Subject: ${blogSubject}

      You can view the full post here:
      ${link}

      Thanks,
      The Match Manager Team
    `;
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

export const sendStatusChangeEmail = async (email: string, name: string, clubName: string, newStatus: MembershipStatus) => {
    try {
        const { data, error } = await resend.emails.send({
            from: `Match Manager <${fromEmail}>`,
            to: [email],
            subject: 'Your Membership Status has been updated',
            text: createStatusChangeEmailBody(name, clubName, newStatus),
        });

        if (error) {
            console.error('Resend error:', error);
            throw new Error('Failed to send status change email.');
        }
        return data;
    } catch (error) {
        console.error('Error in sendStatusChangeEmail:', error);
        throw error;
    }
};

export const sendMultiRecipientTestEmail = async () => {
    const recipients = ["stwinton@me.com", "stuart.thomas.winton@gmail.com"];
    try {
        const { data, error } = await resend.emails.send({
            from: `Match Manager <${fromEmail}>`,
            to: [fromEmail], // Send to a single, non-sensitive address
            bcc: recipients, // Use BCC for the actual recipient list
            subject: 'Multi Recipient Test',
            text: 'This is a test email to 2 recipients',
        });

        if (error) {
            console.error('Resend error:', error);
            throw new Error('Failed to send multi-recipient test email.');
        }
        return data;
    } catch (error) {
        console.error('Error in sendMultiRecipientTestEmail:', error);
        throw error;
    }
}

const getBaseUrl = (): string => {
  // If NEXT_PUBLIC_BASE_URL is set, use it.
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  // Otherwise, try to construct from Vercel/Next.js headers.
  const headersList = headers();
  const host = headersList.get('host'); // e.g., 'your-project.vercel.app' or 'localhost:3000'
  const protocol = headersList.get('x-forwarded-proto') || 'http'; // 'https' on Vercel
  
  if (host) {
    return `${protocol}://${host}`;
  }
  
  // Fallback for local development if headers are not available.
  return 'http://localhost:3000';
};


export const sendBlogPostNotificationEmail = async (clubId: string, blogSubject: string, postId: string) => {
  if (!firestore) {
    throw new Error('Firestore not initialized');
  }

  const clubDoc = await getDoc(doc(firestore, 'clubs', clubId));
  const clubName = clubDoc.exists() ? clubDoc.data().name : 'Your Club';

  const usersQuery = query(
    collection(firestore, 'users'),
    where('primaryClubId', '==', clubId),
    where('memberStatus', '==', 'Member')
  );
  const usersSnapshot = await getDocs(usersQuery);
  const recipientEmails = usersSnapshot.docs.map(doc => doc.data().email).filter(email => email);

  if (recipientEmails.length === 0) {
    return;
  }

  // Generate a fully-qualified URL for the blog post
  const baseUrl = getBaseUrl();
  const postUrl = `${baseUrl}/main/blog/${postId}`;

  const { data, error } = await resend.emails.send({
    from: `Match Manager <${fromEmail}>`,
    to: fromEmail,
    bcc: recipientEmails,
    subject: `New Blog Post from ${clubName}: ${blogSubject}`,
    text: createBlogPostEmailBody(blogSubject, clubName, postUrl),
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error('Failed to send blog post notification email.');
  }

  return data;
}
