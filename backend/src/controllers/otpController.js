import prisma from "../config/prisma.js";
import {
  createPhoneOTP,
  verifyPhoneOTP,
  isValidOTP,
  markOTPVerified,
} from "../services/otpService.js";
import { generateToken } from "../utils/jwt.js";
import { isDevelopment, getDevOTP } from "../services/notificationService.js";

/**
 * Request phone OTP for login (by email lookup)
 */
export const requestPhoneOTPForLogin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number not found for this user",
      });
    }

    // Create and send OTP to phone
    await createPhoneOTP(user.id, user.phoneNumber, "login");

    res.status(200).json({
      success: true,
      message: "OTP sent to phone",
      data: {
        phoneNumber: user.phoneNumber.replace(/\d(?=\d{4})/g, "*"), // Mask all but last 4 digits
        ...(isDevelopment() && { devOtp: getDevOTP(), note: "Development mode - use this OTP" }),
      },
    });
  } catch (error) {
    console.error("Request phone OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

/**
 * Send OTP to phone
 */
export const sendPhoneOTP = async (req, res) => {
  try {
    const { userId, phoneNumber } = req.body;

    if (!userId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "User ID and phone number are required",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create and send OTP
    await createPhoneOTP(userId, phoneNumber);

    // Update user's phone number if changed
    if (user.phoneNumber !== phoneNumber) {
      await prisma.user.update({
        where: { id: userId },
        data: { phoneNumber },
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent to phone",
      data: isDevelopment()
        ? { devOtp: getDevOTP(), note: "Development mode - use this OTP" }
        : { note: "Check your phone for OTP" },
    });
  } catch (error) {
    console.error("Send phone OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

/**
 * Verify phone OTP (for login completion)
 */
export const verifyPhoneOTPForLogin = async (req, res) => {
  try {
    const { email, phoneNumber, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Use provided phone number or user's stored phone number
    const phoneToVerify = phoneNumber || user.phoneNumber;

    if (!phoneToVerify) {
      return res.status(400).json({
        success: false,
        message: "Phone number not found",
      });
    }

    // Verify OTP
    const result = await verifyPhoneOTP(user.id, phoneToVerify, otp);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error("Verify phone OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

/**
 * Verify phone OTP
 */
export const verifyPhoneOTPCode = async (req, res) => {
  try {
    const { userId, phoneNumber, otp } = req.body;

    if (!userId || !phoneNumber || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID, phone number, and OTP are required",
      });
    }

    const result = await verifyPhoneOTP(userId, phoneNumber, otp);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Verify phone OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

/**
 * Verify phone OTP for signup (completes registration)
 */
export const verifySignupOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, tempUserId } = req.body;

    if (!phoneNumber || !otp || !tempUserId) {
      return res.status(400).json({
        success: false,
        message: "Phone number, OTP, and temp user ID are required",
      });
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: tempUserId },
      include: {
        organization: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify phone OTP
    const result = await verifyPhoneOTP(user.id, phoneNumber, otp);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Update user phone verification status
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerified: true },
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    });

    res.status(200).json({
      success: true,
      message: "Signup completed successfully",
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          profileImage: user.profileImage,
          emailVerified: user.emailVerified,
          phoneVerified: true,
          organizationId: user.organizationId,
          createdAt: user.createdAt,
          organization: {
            id: user.organization.id,
            name: user.organization.name,
            slug: user.organization.slug,
          },
        },
        token,
      },
    });
  } catch (error) {
    console.error("Verify signup OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete signup",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

/**
 * Resend OTP
 */
export const resendOTP = async (req, res) => {
  try {
    const { userId, phoneNumber, purpose = "verification" } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Use provided phone number or user's stored phone number
    const phoneToSend = phoneNumber || user.phoneNumber;

    if (!phoneToSend) {
      return res.status(400).json({
        success: false,
        message: "Phone number not found",
      });
    }

    // Always send to phone
    await createPhoneOTP(userId, phoneToSend, purpose);

    res.status(200).json({
      success: true,
      message: "OTP resent",
      data: isDevelopment()
        ? { devOtp: getDevOTP(), note: "Development mode - use this OTP" }
        : { note: "Check your device for OTP" },
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};
