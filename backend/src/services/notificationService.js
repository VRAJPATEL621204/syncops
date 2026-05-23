// Notification service using Fast2SMS (SMS) and EmailJS (Email)
// Fast2SMS: Quick API with message structure in code
// EmailJS: Template-based email service

import emailjs from "@emailjs/nodejs";

const IS_DEV = process.env.NODE_ENV !== "production";
const DEV_OTP = process.env.DEV_OTP || "123456";

// Fast2SMS Configuration
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_BASE_URL = "https://www.fast2sms.com/dev/bulkV2";

// EmailJS Configuration (for invitations only - NOT for OTP)
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID_INVITE = process.env.EMAILJS_TEMPLATE_ID_INVITE;
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

/**
 * Send OTP via SMS using Fast2SMS Quick API
 * Message structure is defined in code, sent via API
 * @param {string} phoneNumber - Phone number to send OTP to
 * @param {string} otp - The OTP code
 * @param {string} purpose - Purpose (signup/login/verification)
 * @returns {Promise<boolean>} - Success status
 */
export const sendSMS = async (phoneNumber, otp, purpose = "verification") => {
  // Format phone number for validation and logging
  let formattedForLogging = phoneNumber.replace(/\D/g, "");
  if (formattedForLogging.startsWith("91") && formattedForLogging.length === 12) {
    formattedForLogging = formattedForLogging.substring(2);
  }
  
  // Always log for debugging
  console.log(`[SMS] Original: ${phoneNumber}, Formatted: ${formattedForLogging}, OTP: ${otp}, Purpose: ${purpose}`);

  try {
    if (!FAST2SMS_API_KEY) {
      console.error("[SMS] Fast2SMS API key not configured - SMS not sent");
      console.log(`[SMS] Dev Mode - Use OTP: ${otp} for phone: ${formattedForLogging}`);
      return false;
    }
    
    console.log("[SMS] Sending real SMS via Fast2SMS...");

    // Format phone number for Fast2SMS (expects 10-digit Indian numbers)
    // Input can be E.164 (+919876543210) or 10-digit (9876543210)
    let formattedNumber = phoneNumber.replace(/\D/g, "");
    
    // Remove country code if present (91 for India)
    if (formattedNumber.startsWith("91") && formattedNumber.length === 12) {
      formattedNumber = formattedNumber.substring(2);
    }
    
    // Validate it's a 10-digit number
    if (formattedNumber.length !== 10) {
      console.error(`[SMS] Invalid phone number format: ${phoneNumber} (got ${formattedNumber.length} digits, expected 10)`);
      return false;
    }

    // Build message based on purpose
    let message = "";
    switch (purpose) {
      case "signup":
        message = `${otp} is your SyncOps verification code for account creation. Valid for 10 minutes. Do not share this code with anyone.`;
        break;
      case "login":
        message = `${otp} is your SyncOps login verification code. Valid for 10 minutes. If you didn't request this, please ignore.`;
        break;
      case "phone_verification":
        message = `${otp} is your SyncOps phone verification code. Valid for 10 minutes.`;
        break;
      default:
        message = `${otp} is your SyncOps verification code. Valid for 10 minutes.`;
    }

    // Fast2SMS Quick API request
    const params = new URLSearchParams({
      authorization: FAST2SMS_API_KEY,
      message: message,
      language: "english",
      route: "q", // Quick SMS route
      numbers: formattedNumber,
    });

    const response = await fetch(`${FAST2SMS_BASE_URL}?${params.toString()}`, {
      method: "GET",
      headers: {
        "cache-control": "no-cache",
      },
    });

    const data = await response.json();

    if (data.return === true) {
      console.log(`[SMS] ✅ Fast2SMS sent successfully to ${formattedNumber}`);
      return true;
    } else {
      console.error("[SMS] ❌ Fast2SMS failed:", data);
      return false;
    }
  } catch (error) {
    console.error("[SMS] ❌ Error sending SMS:", error);
    return false;
  }
};

/**
 * Send OTP via Email using EmailJS (DEPRECATED - use sendSMS instead)
 * OTP is now sent via SMS only for better security
 * @deprecated Use sendSMS for OTP, sendInviteEmail for invitations
 */
export const sendEmail = async (email, otp, purpose = "verification", extraData = {}) => {
  console.log("[DEPRECATED] Email OTP is disabled. OTP sent via SMS only.");
  return false;
};

/**
 * Send invitation email using EmailJS
 * @param {string} email - Invitee email
 * @param {string} inviteToken - Invitation token
 * @param {string} inviterName - Name of person sending invite
 * @param {string} organizationName - Organization name
 * @param {string} role - Role being invited as
 * @param {string|null} teamName - Optional team name
 * @param {string|null} welcomeMessage - Optional welcome message
 * @returns {Promise<boolean>} - Success status
 */
export const sendInviteEmail = async (email, inviteToken, inviterName, organizationName, role, teamName = null, welcomeMessage = null) => {
  const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/accept-invite?token=${inviteToken}`;
  
  // Always log for debugging
  console.log(`[EMAIL INVITE] To: ${email}`);
  console.log(`[EMAIL INVITE] Organization: ${organizationName}, Role: ${role}${teamName ? `, Team: ${teamName}` : ''}`);
  console.log(`[EMAIL INVITE] Link: ${inviteUrl}`);
  if (welcomeMessage) {
    console.log(`[EMAIL INVITE] Message: ${welcomeMessage}`);
  }

  try {
    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_INVITE || !EMAILJS_PUBLIC_KEY) {
      console.error("[EMAIL INVITE] ❌ EmailJS configuration missing - email not sent");
      return false;
    }
    
    console.log("[EMAIL INVITE] Sending real email via EmailJS...");

    const templateParams = {
      to_email: email,
      inviter_name: inviterName,
      inviter_initial: inviterName.charAt(0).toUpperCase(),
      organization_name: organizationName,
      team_name: teamName || "",
      role: role.toUpperCase(),
      welcome_message: welcomeMessage || "",
      invite_link: inviteUrl,
      invite_token: inviteToken,
      company_name: "SyncOps",
      company_logo: "https://syncops.io/logo.png",
      support_email: "support@syncops.io",
      year: new Date().getFullYear(),
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_INVITE,
      templateParams,
      {
        publicKey: EMAILJS_PUBLIC_KEY,
        privateKey: EMAILJS_PRIVATE_KEY,
      }
    );

    console.log(`[EMAIL INVITE] ✅ EmailJS sent:`, response.status, response.text);
    return true;
  } catch (error) {
    console.error("[EMAIL INVITE] ❌ Error sending invite:", error);
    return false;
  }
};

/**
 * Get development bypass OTP
 * @returns {string} - The dev OTP code
 */
export const getDevOTP = () => {
  return DEV_OTP;
};

/**
 * Check if in development mode
 * @returns {boolean}
 */
export const isDevelopment = () => {
  return IS_DEV;
};
