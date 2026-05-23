import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma.js";
import { sendInviteEmail } from "../services/notificationService.js";
import { generateToken } from "../utils/jwt.js";
import { isDevelopment } from "../services/notificationService.js";

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

    // Check if email already exists in organization
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        organizationId,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists in your organization",
      });
    }

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

    res.status(200).json({
      success: true,
      message: "Invitation is valid",
      data: {
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
 * Accept invitation and create account
 */
export const acceptInvite = async (req, res) => {
  try {
    const { token, fullName, password, phoneNumber } = req.body;

    // Validation
    if (!token || !fullName || !password) {
      return res.status(400).json({
        success: false,
        message: "Token, full name, and password are required",
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

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and update invite in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          fullName,
          email: invite.email,
          password: hashedPassword,
          phoneNumber,
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

      // Add user to team if invite had teamId
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

    // Generate token
    const authToken = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      organizationId: result.user.organizationId,
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        user: result.user,
        token: authToken,
      },
    });
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
