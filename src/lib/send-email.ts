
'use server';

import { Resend } from 'resend';
import type { PublicMatch, Result, Club, Match } from './types';
import { firestore } from './firebase-client';
import { collection, doc, getDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

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

const createResultsEmailBody = (matchData: Match, clubName: string, results: Result[]): string => {
  const formattedDate = format(matchData.date instanceof Timestamp ? matchData.date.toDate() : matchData.date, 'PPP');
  let body = `Results for ${matchData.seriesName}, ${matchData.name} on ${formattedDate}\n\n`;

  // Helper to format a results section
  const formatResults = (title: string, sortedResults: Result[]) => {
    body += `--- ${title} ---\n`;
    sortedResults.forEach(r => {
      body += `${r.position || '-'}. ${r.userName} - ${r.weight.toFixed(3)}kg (Peg: ${r.peg || 'N/A'}, Sec: ${r.section || 'N/A'})\n`;
    });
    body += '\n';
  };

  // Overall Results
  const overallResults = [...results].sort((a, b) => (a.position || 999) - (b.position || 999));
  formatResults('Overall Results', overallResults);

  // Results by Section
  const resultsBySection: { [key: string]: Result[] } = {};
  results.forEach(r => {
    const sectionKey = r.section || 'Unsectioned';
    if (!resultsBySection[sectionKey]) {
      resultsBySection[sectionKey] = [];
    }
    resultsBySection[sectionKey].push(r);
  });

  Object.keys(resultsBySection).sort().forEach(sectionKey => {
    const sectionResults = resultsBySection[sectionKey].sort((a, b) => b.weight - a.weight);
    formatResults(`Section: ${sectionKey}`, sectionResults);
  });
  
  // Results by Peg
  const pegResults = [...results].sort((a, b) => (a.peg || '').localeCompare(b.peg || '', undefined, { numeric: true }));
  formatResults('Results by Peg', pegResults);


  return body;
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

export async function sendResultsEmail(matchId: string, recipientEmail: string) {
    if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
        throw new Error("Email server is not configured. Missing RESEND_API_KEY or FROM_EMAIL.");
    }
    if (!firestore) {
        throw new Error("Firestore is not initialized.");
    }
    
    try {
        // Fetch match data
        const matchDocRef = doc(firestore, 'matches', matchId);
        const matchDoc = await getDoc(matchDocRef);
        if (!matchDoc.exists()) {
            throw new Error(`Match with ID ${matchId} not found.`);
        }
        const matchData = matchDoc.data() as Match;
        
        // Fetch club data
        const clubDocRef = doc(firestore, 'clubs', matchData.clubId);
        const clubDoc = await getDoc(clubDocRef);
        const clubName = clubDoc.exists() ? clubDoc.data().name : 'Unknown Club';
        
        // Fetch results data
        const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', matchId));
        const resultsSnapshot = await getDocs(resultsQuery);
        const resultsData = resultsSnapshot.docs.map(doc => doc.data() as Result);
        
        if (resultsData.length === 0) {
            throw new Error("No results found for this match.");
        }

        const emailBody = createResultsEmailBody(matchData, clubName, resultsData);
        const formattedDate = format(matchData.date instanceof Timestamp ? matchData.date.toDate() : matchData.date, 'PPP');
        const subject = `${clubName} Results: ${matchData.seriesName} - ${matchData.name} - ${formattedDate}`;

        const { data, error } = await resend.emails.send({
            from: `Match Manager <${fromEmail}>`,
            to: [recipientEmail],
            subject: subject,
            text: emailBody,
        });

        if (error) {
            console.error('Resend error:', error);
            throw new Error('Failed to send results email.');
        }

        return { success: true, data };
    } catch (error) {
        console.error('Error in sendResultsEmail:', error);
        throw error;
    }
}

    