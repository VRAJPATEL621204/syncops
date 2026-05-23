import prisma from "../config/prisma.js";
import { sendSMS, sendEmail, getDevOTP } from "./notificationService.js";

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "10");
const OTP_LENGTH = 6;
const DEV_OTP = process.env.DEV_OTP || "123456";

/**
 * Generate a random OTP
 * @returns {string} - Generated OTP
 */
export const generateOTP = () => {
  // Generate random 6-digit OTP (dev OTP 123456 also works for verification)
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

/**
 * Calculate OTP expiry time
 * @returns {Date} - Expiry timestamp
 */
export const getExpiryTime = () => {
  return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
};

/**
 * Create and send OTP for phone verification
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Phone number
 * @param {string} purpose - Purpose (signup/login/phone_verification)
 * @returns {Promise<Object>} - OTP record
 */
export const createPhoneOTP = async (userId, phoneNumber, purpose = "phone_verification") => {
  // Invalidate any existing OTPs for this phone
  await prisma.oTPVerification.updateMany({
    where: {
      userId,
      phoneNumber,
      verified: false,
    },
    data: {
      verified: true, // Mark as used to invalidate
    },
  });

  const otp = generateOTP();
  const expiresAt = getExpiryTime();

  const otpRecord = await prisma.oTPVerification.create({
    data: {
      userId,
      phoneNumber,
      otp,
      expiresAt,
      verified: false,
    },
  });

  // Send SMS with purpose for customized message
  await sendSMS(phoneNumber, otp, purpose);

  return otpRecord;
};

/**
 * Create and send OTP for email verification
 * @param {string} userId - User ID
 * @param {string} email - Email address
 * @param {string} purpose - Purpose (signup/login)
 * @returns {Promise<Object>} - OTP record
 */
export const createEmailOTP = async (userId, email, purpose = "verification") => {
  // For email OTP, we'll store in OTPVerification with phoneNumber as email
  // Or you could create a separate EmailOTP model
  const otp = generateOTP();
  const expiresAt = getExpiryTime();

  // Store in a simple in-memory store for email OTPs (or extend schema)
  // For now, we'll use the OTPVerification table with phoneNumber as email identifier
  const otpRecord = await prisma.oTPVerification.create({
    data: {
      userId,
      phoneNumber: `email:${email}`, // Prefix to distinguish from phone
      otp,
      expiresAt,
      verified: false,
    },
  });

  // Send Email with user data for template
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  
  await sendEmail(email, otp, purpose, {
    userName: user?.fullName || "User",
  });

  return otpRecord;
};

/**
 * Verify phone OTP
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Phone number
 * @param {string} otp - OTP to verify
 * @returns {Promise<Object>} - Verification result
 */
export const verifyPhoneOTP = async (userId, phoneNumber, otp) => {
  // Check for dev OTP bypass (always works)
  if (otp === DEV_OTP) {
    console.log("[OTP] Dev OTP 123456 accepted");
    // Mark any existing OTP as verified and update user
    await prisma.oTPVerification.updateMany({
      where: {
        userId,
        phoneNumber,
        verified: false,
      },
      data: { verified: true },
    });
    
    await prisma.user.update({
      where: { id: userId },
      data: { phoneVerified: true },
    });
    
    return {
      success: true,
      message: "Phone verified successfully (dev OTP)",
    };
  }

  const otpRecord = await prisma.oTPVerification.findFirst({
    where: {
      userId,
      phoneNumber,
      otp,
      verified: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!otpRecord) {
    return {
      success: false,
      message: "Invalid or expired OTP",
    };
  }

  // Mark as verified
  await prisma.oTPVerification.update({
    where: { id: otpRecord.id },
    data: { verified: true },
  });

  // Update user's phone verification status
  await prisma.user.update({
    where: { id: userId },
    data: { phoneVerified: true },
  });

  return {
    success: true,
    message: "Phone verified successfully",
  };
};

/**
 * Verify email OTP
 * @param {string} userId - User ID
 * @param {string} email - Email address
 * @param {string} otp - OTP to verify
 * @returns {Promise<Object>} - Verification result
 */
export const verifyEmailOTP = async (userId, email, otp) => {
  const otpRecord = await prisma.oTPVerification.findFirst({
    where: {
      userId,
      phoneNumber: `email:${email}`,
      otp,
      verified: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!otpRecord) {
    return {
      success: false,
      message: "Invalid or expired OTP",
    };
  }

  // Mark as verified
  await prisma.oTPVerification.update({
    where: { id: otpRecord.id },
    data: { verified: true },
  });

  // Update user's email verification status
  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });

  return {
    success: true,
    message: "Email verified successfully",
  };
};

/**
 * Check if OTP is valid (without marking as verified)
 * @param {string} userId - User ID
 * @param {string} identifier - Phone or email identifier
 * @param {string} otp - OTP to check
 * @returns {Promise<boolean>} - Is valid
 */
export const isValidOTP = async (userId, identifier, otp) => {
  // Dev OTP bypass (always valid)
  if (otp === DEV_OTP) {
    return true;
  }
  
  const otpRecord = await prisma.oTPVerification.findFirst({
    where: {
      userId,
      phoneNumber: identifier,
      otp,
      verified: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  return !!otpRecord;
};

/**
 * Mark OTP as verified
 * @param {string} userId - User ID
 * @param {string} identifier - Phone or email identifier
 * @param {string} otp - OTP to mark
 * @returns {Promise<void>}
 */
export const markOTPVerified = async (userId, identifier, otp) => {
  await prisma.oTPVerification.updateMany({
    where: {
      userId,
      phoneNumber: identifier,
      otp,
    },
    data: {
      verified: true,
    },
  });
};

/**
 * Clean up expired OTPs
 * @returns {Promise<number>} - Number of deleted records
 */
export const cleanupExpiredOTPs = async () => {
  const result = await prisma.oTPVerification.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
};
