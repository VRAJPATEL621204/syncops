import prisma from "../config/prisma.js";

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

    // Add member
    const member = await prisma.teamMember.create({
      data: {
        userId,
        teamId,
      },
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
    });

    res.status(201).json({
      success: true,
      message: "Member added to team successfully",
      data: {
        id: member.id,
        user: member.user,
        joinedAt: member.joinedAt,
      },
    });
  } catch (error) {
    console.error("Add team member error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add team member",
      error: error.message,
    });
  }
};

/**
 * Remove member from team (Admin only)
 */
export const removeTeamMember = async (req, res) => {
  try {
    const { teamId, userId } = req.body;
    const organizationId = req.user.organizationId;
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can remove team members",
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

    // Remove member
    await prisma.teamMember.deleteMany({
      where: {
        teamId,
        userId,
      },
    });

    res.json({
      success: true,
      message: "Member removed from team successfully",
    });
  } catch (error) {
    console.error("Remove team member error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove team member",
      error: error.message,
    });
  }
};
