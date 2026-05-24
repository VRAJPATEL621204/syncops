import prisma from "../config/prisma.js";
import { createTeamRoom, addUserToTeamRoom, removeUserFromTeamRoom } from "../services/roomService.js";
import { getIO } from "../config/socket.js";

/**
 * Create a new team (Admin only)
 */
export const createTeam = async (req, res) => {
  try {
    const { name, description } = req.body;
    const organizationId = req.user.organizationId;
    const userRole = req.user.role;

    // Admin only
    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can create teams",
      });
    }

    // Validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Team name must be at least 2 characters",
      });
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        organizationId,
      },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    // Create team chat room
    await createTeamRoom(team.id, organizationId, req.user.userId);

    res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: {
        id: team.id,
        name: team.name,
        description: team.description,
        memberCount: team._count.members,
        createdAt: team.createdAt,
      },
    });
  } catch (error) {
    console.error("Create team error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create team",
      error: error.message,
    });
  }
};

/**
 * Get all teams for organization (Admin/Manager)
 */
export const getTeams = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const userRole = req.user.role;
    const userId = req.user.userId;

    // Admin sees all teams, manager sees only their assigned teams
    let teams;
    if (userRole === "admin") {
      teams = await prisma.team.findMany({
        where: { organizationId },
        include: {
          _count: {
            select: { members: true },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: true,
                  profileImage: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (userRole === "manager") {
      // Managers see teams they are members of
      const managerTeams = await prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      const teamIds = managerTeams.map((t) => t.teamId);

      teams = await prisma.team.findMany({
        where: {
          id: { in: teamIds },
          organizationId,
        },
        include: {
          _count: {
            select: { members: true },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: true,
                  profileImage: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } else {
      // Employees see teams they are members of (same as managers)
      const employeeTeams = await prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      const teamIds = employeeTeams.map((t) => t.teamId);

      teams = await prisma.team.findMany({
        where: {
          id: { in: teamIds },
          organizationId,
        },
        include: {
          _count: {
            select: { members: true },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: true,
                  profileImage: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Format response
    const formattedTeams = teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      memberCount: team._count.members,
      members: team.members.map((m) => ({
        id: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
        role: m.user.role,
        profileImage: m.user.profileImage,
        joinedAt: m.joinedAt,
      })),
      createdAt: team.createdAt,
    }));

    res.json({
      success: true,
      data: formattedTeams,
    });
  } catch (error) {
    console.error("Get teams error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teams",
      error: error.message,
    });
  }
};

/**
 * Get single team details
 */
export const getTeamById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;

    const team = await prisma.team.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                profileImage: true,
                phoneNumber: true,
                createdAt: true,
              },
            },
          },
        },
        inviteTokens: {
          where: {
            status: "pending",
          },
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    res.json({
      success: true,
      data: {
        id: team.id,
        name: team.name,
        description: team.description,
        members: team.members.map((m) => ({
          id: m.user.id,
          fullName: m.user.fullName,
          email: m.user.email,
          role: m.user.role,
          profileImage: m.user.profileImage,
          phoneNumber: m.user.phoneNumber,
          joinedAt: m.joinedAt,
        })),
        pendingInvites: team.inviteTokens,
        createdAt: team.createdAt,
      },
    });
  } catch (error) {
    console.error("Get team error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch team",
      error: error.message,
    });
  }
};

/**
 * Delete team (Admin only)
 */
export const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete teams",
      });
    }

    // Check team exists and belongs to organization
    const team = await prisma.team.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    await prisma.team.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Team deleted successfully",
    });
  } catch (error) {
    console.error("Delete team error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete team",
      error: error.message,
    });
  }
};

/**
 * Add member to team (Admin/Manager)
 */
export const addTeamMember = async (req, res) => {
  try {
    const { teamId, userId } = req.body;
    const organizationId = req.user.organizationId;
    const userRole = req.user.role;

    // Check permissions
    if (!["admin", "manager"].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to add team members",
      });
    }

    // Verify team belongs to organization
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

    // Verify user belongs to organization
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationId,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found in organization",
      });
    }

    // Check if already member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    if (existingMember) {
      return res.status(409).json({
        success: false,
        message: "User is already a member of this team",
      });
    }

    // Manager can only add to their own teams
    if (userRole === "manager") {
      const isMember = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: req.user.userId, teamId } },
      });
      if (!isMember) {
        return res.status(403).json({ success: false, message: "Managers can only add members to their own teams" });
      }
    }

    // Add member
    const member = await prisma.teamMember.create({
      data: { userId, teamId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true, profileImage: true, phoneNumber: true },
        },
      },
    });

    // Sync: add user to team chat room
    await addUserToTeamRoom(userId, teamId);

    // Broadcast membership change to org so sidebars update
    try {
      const io = getIO();
      io.to(`org:${organizationId}`).emit('team:memberAdded', { teamId, userId, user: member.user });
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: "Member added to team successfully",
      data: { id: member.id, user: member.user, joinedAt: member.joinedAt },
    });
  } catch (error) {
    console.error("Add team member error:", error);
    res.status(500).json({ success: false, message: "Failed to add team member", error: error.message });
  }
};

/**
 * Remove member from team (Admin or manager of that team)
 */
export const removeTeamMember = async (req, res) => {
  try {
    const { teamId, userId } = req.body;
    const organizationId = req.user.organizationId;
    const userRole = req.user.role;
    const requesterId = req.user.userId;

    if (!['admin', 'manager'].includes(userRole)) {
      return res.status(403).json({ success: false, message: "Unauthorized to remove team members" });
    }

    // Manager can only remove from their own teams
    if (userRole === 'manager') {
      const isMember = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: requesterId, teamId } },
      });
      if (!isMember) {
        return res.status(403).json({ success: false, message: "Managers can only remove members from their own teams" });
      }
    }

    // Verify team belongs to organization
    const team = await prisma.team.findFirst({ where: { id: teamId, organizationId } });
    if (!team) {
      return res.status(404).json({ success: false, message: "Team not found" });
    }

    // Remove TeamMember record
    await prisma.teamMember.deleteMany({ where: { teamId, userId } });

    // Sync: remove from team chat room
    await removeUserFromTeamRoom(userId, teamId);

    // Broadcast so sidebars/UIs update
    try {
      const io = getIO();
      io.to(`org:${organizationId}`).emit('team:memberRemoved', { teamId, userId });
    } catch (_) {}

    res.json({ success: true, message: "Member removed from team successfully" });
  } catch (error) {
    console.error("Remove team member error:", error);
    res.status(500).json({ success: false, message: "Failed to remove team member", error: error.message });
  }
};

/**
 * Get all organization members (Admin only)
 */
export const getOrgMembers = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const users = await prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        profileImage: true,
        createdAt: true,
        teamMembers: {
          select: {
            joinedAt: true,
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phoneNumber: u.phoneNumber,
      role: u.role,
      profileImage: u.profileImage,
      joinedAt: u.createdAt,
      teams: u.teamMembers.map(tm => ({ id: tm.team.id, name: tm.team.name, joinedAt: tm.joinedAt })),
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Get org members error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch organization members', error: error.message });
  }
};

/**
 * Remove user from organization entirely (Admin only — full offboarding)
 */
export const removeFromOrganization = async (req, res) => {
  try {
    const { userId } = req.body;
    const organizationId = req.user.organizationId;
    const requesterId = req.user.userId;

    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only admins can remove organization members" });
    }

    if (userId === requesterId) {
      return res.status(400).json({ success: false, message: "Cannot remove yourself from the organization" });
    }

    // Verify user is in this organization
    const target = await prisma.user.findFirst({ where: { id: userId, organizationId } });
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found in organization" });
    }

    // Get all teams the user belongs to (for room cleanup)
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    // Remove from all team rooms
    for (const { teamId } of teamMemberships) {
      await removeUserFromTeamRoom(userId, teamId);
    }

    // Remove from all team memberships
    await prisma.teamMember.deleteMany({ where: { userId } });

    // Remove from ALL room participant records (org room, team rooms, incident rooms, DMs)
    await prisma.roomParticipant.deleteMany({ where: { userId } });

    // Soft-offboard: keep user record for historical audit trail (messages, incident logs preserved)
    // Revoke invites so they can't re-join via old links
    await prisma.inviteToken.deleteMany({ where: { organizationId, invitedById: userId } });
    // The user record stays in org but has no team/room memberships — effectively locked out of all content

    // Broadcast to org so all clients update
    try {
      const io = getIO();
      io.to(`org:${organizationId}`).emit('org:memberRemoved', { userId });
    } catch (_) {}

    res.json({ success: true, message: "User removed from organization successfully" });
  } catch (error) {
    console.error('Remove from org error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove user from organization', error: error.message });
  }
};
