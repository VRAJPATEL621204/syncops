import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { sendInviteEmail } from "../services/notificationService.js";
import { generateToken } from "../utils/jwt.js";
import { setAuthCookie } from "../utils/cookieHelper.js";
import { isDevelopment } from "../services/notificationService.js";
import { addUserToOrgRoom, addUserToTeamRoom } from "../services/roomService.js";

const INVITE_EXPIRY_DAYS = 7;

/**
 * Generate secure invite token
 */
const generateInviteToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

/**
 * Create invitation (Admin/Manager only)
 */
export const createInvite = async (req, res) => {
  try {
    const { email, role, teamId, welcomeMessage } = req.body;
    const inviterId = req.user.userId;
    const organizationId = req.user.organizationId;

    // Validation
    if (!email || !role) {
      return res.status(400).json({
        success: false,
        message: "Email and role are required",
      });
    }

    // Validate role
    if (!["manager", "employee"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be 'manager' or 'employee'",
      });
    }

    // Check if inviter has permission (admin can invite manager/employee, manager can invite employee only)
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      include: { organization: true },
    });

    if (!inviter) {
      return res.status(404).json({
        success: false,
        message: "Inviter not found",
      });
    }

    if (inviter.role === "manager" && role === "manager") {
      return res.status(403).json({
        success: false,
        message: "Managers can only invite employees, not other managers",
      });
    }

    // Check if user exists (for multi-team support)
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
      },
      include: {
        teamMembers: teamId ? {
          where: { teamId },
        } : false,
      },
    });

    // CASE 1: User exists in DIFFERENT organization - BLOCK
    if (existingUser && existingUser.organizationId !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "User already belongs to another organization",
        code: "DIFFERENT_ORG",
      });
    }

    // CASE 2: User already in TARGET team - BLOCK
    if (existingUser && teamId && existingUser.teamMembers?.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User already belongs to this team",
        code: "ALREADY_IN_TEAM",
      });
    }

    // CASE 3: User exists in SAME org but DIFFERENT team - ALLOW (multi-team support)
    // Continue with invite creation

    // Check for existing pending invite
    const existingInvite = await prisma.inviteToken.findFirst({
      where: {
        email,
        organizationId,
        status: "pending",
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvite) {
      return res.status(409).json({
        success: false,
        message: "An active invitation already exists for this email",
        data: {
          inviteId: existingInvite.id,
          expiresAt: existingInvite.expiresAt,
        },
      });
    }

    // Generate token
    const token = generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

    // Validate team if provided
    if (teamId) {
      const team = await prisma.team.findFirst({
        where: {
          id: teamId,
          organizationId,
        },
      });
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Team not found",
        });
      }
    }

    // Create invite record
    const invite = await prisma.inviteToken.create({
      data: {
        token,
        email,
        role,
        organizationId,
        invitedById: inviterId,
        teamId: teamId || null,
        welcomeMessage: welcomeMessage?.trim() || null,
        expiresAt,
        status: "pending",
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        team: teamId ? {
          select: {
            id: true,
            name: true,
          },
        } : false,
      },
    });

    // Send invitation email
    await sendInviteEmail(
      email,
      token,
      inviter.fullName,
      inviter.organization.name,
      role,
      teamId ? invite.team?.name : null,
      welcomeMessage
    );

    res.status(201).json({
      success: true,
      message: "Invitation sent successfully",
      data: {
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          expiresAt: invite.expiresAt,
          team: invite.team,
          welcomeMessage: invite.welcomeMessage,
          organization: invite.organization,
          invitedBy: invite.invitedBy,
        },
        ...(isDevelopment() && { 
          devToken: token, 
          note: "Development mode - use this token" 
        }),
      },
    });
  } catch (error) {
    console.error("Create invite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create invitation",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

/**
 * Validate invite token (check if valid and get details)
 */
export const validateInvite = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            logo: true,
          },
        },
        invitedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invalid invitation token",
      });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Invitation has already been ${invite.status}`,
      });
    }

    if (invite.expiresAt < new Date()) {
      // Update status to expired
      await prisma.inviteToken.update({
        where: { id: invite.id },
        data: { status: "expired" },
      });

      return res.status(400).json({
        success: false,
        message: "Invitation has expired",
      });
    }

    // Check if the invited email already has an account
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true },
    });

    res.status(200).json({
      success: true,
      message: "Invitation is valid",
      data: {
        userExists: !!existingUser,
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          welcomeMessage: invite.welcomeMessage,
          team: invite.team,
          organization: invite.organization,
          invitedBy: invite.invitedBy,
          expiresAt: invite.expiresAt,
        },
      },
    });
  } catch (error) {
    console.error("Validate invite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate invitation",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

/**
 * Accept invitation and create account or add to team (Multi-team support)
 * 
 * CASE 1: New user → Create account + add to team
 * CASE 2: Existing user in same org → Just add to team
 * CASE 3: Existing user in diff org → Block (multi-org not supported)
 * CASE 4: Already in team → Return error
 */
export const acceptInvite = async (req, res) => {
  try {
    const { token, fullName, password, phoneNumber } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    // Get invite with team info
    const invite = await prisma.inviteToken.findUnique({
      where: { token },
      include: {
        organization: true,
        team: true,
      },
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invalid invitation token",
      });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Invitation has already been ${invite.status}`,
      });
    }

    if (invite.expiresAt < new Date()) {
      await prisma.inviteToken.update({
        where: { id: invite.id },
        data: { status: "expired" },
      });

      return res.status(400).json({
        success: false,
        message: "Invitation has expired",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
      include: {
        teamMembers: {
          where: { teamId: invite.teamId },
        },
      },
    });

    // CASE 3: User exists in DIFFERENT organization - BLOCK
    if (existingUser && existingUser.organizationId !== invite.organizationId) {
      return res.status(403).json({
        success: false,
        message: "User already belongs to another organization",
        code: "DIFFERENT_ORG",
      });
    }

    // CASE 4: User already in this team - BLOCK
    if (existingUser && existingUser.teamMembers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User already belongs to this team",
        code: "ALREADY_IN_TEAM",
      });
    }

    // CASE 2: Existing user in SAME organization - Verify password then add to team
    if (existingUser && existingUser.organizationId === invite.organizationId) {
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Password is required to join the team",
          code: "NEW_USER_REQUIRED_FIELDS",
        });
      }
      const passwordMatch = await bcrypt.compare(password, existingUser.password);
      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message: "Incorrect password. Please try again.",
          code: "INVALID_PASSWORD",
        });
      }
      return await processExistingUserInvite(req, res, invite, existingUser);
    }

      // CASE 1: New user - Create account + add to team
    return await processNewUserInvite(req, res, invite, fullName, password, phoneNumber);
  } catch (error) {
    console.error("Accept invite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to accept invitation",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

/**
 * Process invite for NEW user (create account)
 */
const processNewUserInvite = async (req, res, invite, fullName, password, phoneNumber) => {
  // Validate required fields for new user
  if (!fullName || !password) {
    return res.status(400).json({
      success: false,
      message: "Full name and password are required for new users",
      code: "NEW_USER_REQUIRED_FIELDS",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user and add to team in transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        fullName,
        email: invite.email,
        password: hashedPassword,
        phoneNumber: phoneNumber || null,
        role: invite.role,
        organizationId: invite.organizationId,
        emailVerified: true,
        phoneVerified: false,
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

    // Add user to team
    if (invite.teamId) {
      await tx.teamMember.create({
        data: {
          userId: user.id,
          teamId: invite.teamId,
        },
      });
    }

    // Update invite status
    await tx.inviteToken.update({
      where: { id: invite.id },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
      },
    });

    return { user };
  });

  // Add to rooms (outside transaction)
  await addUserToOrgRoom(result.user.id, result.user.organizationId);
  if (invite.teamId) {
    await addUserToTeamRoom(result.user.id, invite.teamId);
  }

  // Generate auth token and set as HttpOnly cookie
  const authToken = generateToken({
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    organizationId: result.user.organizationId,
  });
  setAuthCookie(res, authToken);

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    isNewUser: true,
    data: {
      user: result.user,
    },
  });
};

/**
 * Process invite for EXISTING user (add to new team)
 */
const processExistingUserInvite = async (req, res, invite, existingUser) => {
  // Add user to team in transaction
  await prisma.$transaction(async (tx) => {
    // Add to team
    if (invite.teamId) {
      await tx.teamMember.create({
        data: {
          userId: existingUser.id,
          teamId: invite.teamId,
        },
      });
    }

    // Update invite status
    await tx.inviteToken.update({
      where: { id: invite.id },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
      },
    });
  });

  // Add to team room (outside transaction)
  if (invite.teamId) {
    await addUserToTeamRoom(existingUser.id, invite.teamId);
  }

  // Generate fresh auth token and set as HttpOnly cookie
  const authToken = generateToken({
    userId: existingUser.id,
    email: existingUser.email,
    role: existingUser.role,
    organizationId: existingUser.organizationId,
  });
  setAuthCookie(res, authToken);

  res.status(200).json({
    success: true,
    message: "You've been added to a new team",
    isNewUser: false,
    data: {
      user: {
        id: existingUser.id,
        fullName: existingUser.fullName,
        email: existingUser.email,
        role: existingUser.role,
        organizationId: existingUser.organizationId,
      },
    },
  });
};

/**
 * List invitations for organization
 */
export const listInvites = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { status } = req.query;

    const whereClause = {
      organizationId,
    };

    if (status) {
      whereClause.status = status;
    }

    const invites = await prisma.inviteToken.findMany({
      where: whereClause,
      include: {
        invitedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json({
      success: true,
      data: {
        invites: invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          team: invite.team,
          expiresAt: invite.expiresAt,
          acceptedAt: invite.acceptedAt,
          createdAt: invite.createdAt,
          invitedBy: invite.invitedBy,
        })),
      },
    });
  } catch (error) {
    console.error("List invites error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list invitations",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

/**
 * Cancel invitation
 */
export const cancelInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user.userId;
    const organizationId = req.user.organizationId;

    const invite = await prisma.inviteToken.findFirst({
      where: {
        id: inviteId,
        organizationId,
      },
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel invitation that is already ${invite.status}`,
      });
    }

    // Only inviter or admin can cancel
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (invite.invitedById !== userId && user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only the inviter or admin can cancel this invitation",
      });
    }

    await prisma.inviteToken.delete({
      where: { id: inviteId },
    });

    res.status(200).json({
      success: true,
      message: "Invitation cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel invite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel invitation",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};

/**
 * Resend invitation
 */
export const resendInvite = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user.userId;
    const organizationId = req.user.organizationId;

    const invite = await prisma.inviteToken.findFirst({
      where: {
        id: inviteId,
        organizationId,
      },
      include: {
        organization: true,
        invitedBy: true,
      },
    });

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invitation not found",
      });
    }

    if (invite.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Cannot resend invitation that is already ${invite.status}`,
      });
    }

    // Generate new token
    const newToken = generateInviteToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + INVITE_EXPIRY_DAYS);

    // Update invite with new token and expiry
    const updatedInvite = await prisma.inviteToken.update({
      where: { id: inviteId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
      },
      include: {
        organization: true,
        invitedBy: true,
      },
    });

    // Resend email
    await sendInviteEmail(
      invite.email,
      newToken,
      invite.invitedBy.fullName,
      invite.organization.name,
      invite.role
    );

    res.status(200).json({
      success: true,
      message: "Invitation resent successfully",
      data: {
        invite: {
          id: updatedInvite.id,
          email: updatedInvite.email,
          role: updatedInvite.role,
          status: updatedInvite.status,
          expiresAt: updatedInvite.expiresAt,
        },
        ...(isDevelopment() && { 
          devToken: newToken, 
          note: "Development mode - use this token" 
        }),
      },
    });
  } catch (error) {
    console.error("Resend invite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend invitation",
      error: isDevelopment() ? error.message : undefined,
    });
  }
};
