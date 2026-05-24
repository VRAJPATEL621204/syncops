import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { generateToken } from "../utils/jwt.js";
import { clearAuthCookie } from "../utils/cookieHelper.js";
import { createPhoneOTP } from "../services/otpService.js";
import { isDevelopment, getDevOTP } from "../services/notificationService.js";
import { createOrganizationRoom, addUserToOrgRoom, addUserToTeamRoom } from "../services/roomService.js";

// Step 1: Admin signup - creates organization and admin account, sends phone OTP
export const adminSignup = async (req, res) => {
  try {
    const { fullName, email, password, phoneNumber, organizationName, organizationSlug } = req.body;

    // Validation - phone number is now required
    if (!fullName || !email || !password || !phoneNumber || !organizationName || !organizationSlug) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields including phone number",
      });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Check if organization slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: organizationSlug },
    });

    if (existingOrg) {
      return res.status(409).json({
        success: false,
        message: "Organization slug already taken",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create organization and admin user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: organizationSlug,
        },
      });

      // Create admin user (phone not verified yet)
      const user = await tx.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          phoneNumber,
          role: "admin",
          organizationId: organization.id,
          emailVerified: true, // Email is considered verified on signup
          phoneVerified: false, // Require phone OTP verification
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          role: true,
          profileImage: true,
          emailVerified: true,
          phoneVerified: true,
          organizationId: true,
          createdAt: true,
        },
      });

      return { organization, user };
    });

    // Create organization chat room
    await createOrganizationRoom(result.organization.id, result.user.id);

    // Add user to org room
    await addUserToOrgRoom(result.user.id, result.organization.id);

    // Send OTP to phone for verification
    await createPhoneOTP(result.user.id, phoneNumber, "signup");

    res.status(201).json({
      success: true,
      message: "Account created. Please verify your phone number with OTP.",
      data: {
        tempUserId: result.user.id,
        phoneNumber: result.user.phoneNumber,
        requiresVerification: true,
        verificationMethod: "phone",
        ...(isDevelopment() && { devOtp: getDevOTP(), note: "Development mode - use this OTP" }),
      },
    });
  } catch (error) {
    console.error("Admin signup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create admin account",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

// Step 1: Login - verify credentials, send phone OTP
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user with organization
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
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user has phone number
    if (!user.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "Phone number not found. Please contact support.",
      });
    }

    // Send OTP to phone for login verification
    await createPhoneOTP(user.id, user.phoneNumber, "login");

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: "Credentials verified. Please enter OTP sent to your phone.",
      data: {
        tempUserId: user.id,
        phoneNumber: user.phoneNumber,
        requiresOTP: true,
        verificationMethod: "phone",
        ...(isDevelopment() && { devOtp: getDevOTP(), note: "Development mode - use this OTP" }),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        profileImage: true,
        emailVerified: true,
        phoneVerified: true,
        organizationId: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logo: true,
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

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get profile",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

// Update profile
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, phoneNumber, profileImage } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        phoneNumber,
        profileImage,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        profileImage: true,
        emailVerified: true,
        phoneVerified: true,
        organizationId: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new password",
      });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

// Logout - clear auth cookie
export const logout = (req, res) => {
  clearAuthCookie(res);
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

/**
 * Search users in organization
 */
export const searchUsers = async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { q, limit = 20 } = req.query;

    const users = await prisma.user.findMany({
      where: {
        organizationId,
        id: { not: userId }, // Exclude current user
        ...(q ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        profileImage: true,
        role: true,
      },
      take: parseInt(limit),
    });

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error("[Auth] Search users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search users",
    });
  }
};
