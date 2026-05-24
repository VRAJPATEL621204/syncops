import prisma from "../config/prisma.js";

/**
 * Helper: Create incident log entry
 */
const createIncidentLog = async (incidentId, actorId, action, oldValue = null, newValue = null, message = null) => {
  try {
    await prisma.incidentLog.create({
      data: {
        incidentId,
        actorId,
        action,
        oldValue,
        newValue,
        message,
      },
    });
  } catch (error) {
    console.error("[IncidentLog] Failed to create log:", error);
  }
};

/**
 * Helper: Get user's team IDs
 */
const getUserTeamIds = async (userId) => {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  return memberships.map((m) => m.teamId);
};

/**
 * Helper: Get incident IDs where user is a room participant
 */
const getParticipantIncidentIds = async (userId) => {
  const participations = await prisma.roomParticipant.findMany({
    where: { userId },
    select: { room: { select: { incidentId: true } } },
  });
  return participations
    .map((p) => p.room?.incidentId)
    .filter(Boolean);
};

/**
 * Helper: Build incident query based on user role
 */
const buildIncidentQuery = async (req) => {
  console.log('[buildIncidentQuery] req.user:', req.user);
  const { userId, role, organizationId } = req.user;

  if (!userId || !role || !organizationId) {
    console.error('[buildIncidentQuery] Missing user data:', { userId, role, organizationId });
    throw new Error('Missing user data in token');
  }

  const baseQuery = {
    organizationId,
  };

  if (role === "admin") {
    // Admin sees all incidents in organization
    return baseQuery;
  }

  const [userTeamIds, participantIncidentIds] = await Promise.all([
    getUserTeamIds(userId),
    getParticipantIncidentIds(userId),
  ]);
  console.log('[buildIncidentQuery] userTeamIds:', userTeamIds, 'participantIncidentIds:', participantIncidentIds);

  if (role === "manager") {
    return {
      ...baseQuery,
      OR: [
        { sourceTeamId: { in: userTeamIds } },
        { assignedTeamId: { in: userTeamIds } },
        { assignedManagerId: userId },
        { id: { in: participantIncidentIds } },
      ],
    };
  }

  // Employee sees incidents they created, assigned to their teams, or are a participant of
  return {
    ...baseQuery,
    OR: [
      { createdById: userId },
      { assignedTeamId: { in: userTeamIds } },
      { id: { in: participantIncidentIds } },
    ],
  };
};

/**
 * Helper: Check if user can access specific incident
 */
const canAccessIncident = async (user, incident) => {
  const { userId, role, organizationId } = user;

  // Organization isolation check
  if (incident.organizationId !== organizationId) {
    return false;
  }

  if (role === "admin") {
    return true;
  }

  const [userTeamIds, participantIncidentIds] = await Promise.all([
    getUserTeamIds(userId),
    getParticipantIncidentIds(userId),
  ]);

  // Any role: if the user is a room participant they can access
  if (participantIncidentIds.includes(incident.id)) {
    return true;
  }

  if (role === "manager") {
    return (
      userTeamIds.includes(incident.sourceTeamId) ||
      userTeamIds.includes(incident.assignedTeamId) ||
      incident.assignedManagerId === userId
    );
  }

  // Employee can access if they created it or it's assigned to their team
  return (
    incident.createdById === userId ||
    userTeamIds.includes(incident.assignedTeamId)
  );
};

/**
 * Helper: Check if user can modify incident
 */
const canModifyIncident = async (user, incident) => {
  const { userId, role, organizationId } = user;

  if (incident.organizationId !== organizationId) {
    return false;
  }

  if (role === "admin") {
    return true;
  }

  const userTeamIds = await getUserTeamIds(userId);

  if (role === "manager") {
    // Manager can modify if explicitly assigned, or incident is from/assigned to their team
    return (
      incident.assignedManagerId === userId ||
      userTeamIds.includes(incident.sourceTeamId) ||
      userTeamIds.includes(incident.assignedTeamId)
    );
  }

  // Employees cannot modify incidents (only create)
  return false;
};

/**
 * Helper: Auto-create room for incident
 */
const createIncidentRoom = async (incidentId, title, organizationId, participantIds = []) => {
  try {
    const room = await prisma.room.create({
      data: {
        name: `Incident: ${title}`,
        type: "incident",
        organizationId,
        incidentId,
      },
    });

    // Note: Room participants will be managed when assignment happens
    console.log(`[Room] Created room ${room.id} for incident ${incidentId}`);
    return room;
  } catch (error) {
    console.error("[Room] Failed to create room:", error);
    return null;
  }
};

/**
 * Create new incident
 */
export const createIncident = async (req, res) => {
  console.log(`[Incident] LEGACY createIncident called by user ${req.user.userId} (${req.user.role})`);
  try {
    const {
      title,
      description,
      category,
      priority,
      sourceTeamId,
      assignedTeamId,
    } = req.body;

    const { userId, organizationId, role } = req.user;

    // Validation
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Title must be at least 3 characters",
      });
    }

    if (!sourceTeamId) {
      return res.status(400).json({
        success: false,
        message: "Source team is required",
      });
    }

    // Verify source team belongs to organization
    const sourceTeam = await prisma.team.findFirst({
      where: {
        id: sourceTeamId,
        organizationId,
      },
    });

    if (!sourceTeam) {
      return res.status(404).json({
        success: false,
        message: "Source team not found",
      });
    }

    // If assigned team provided, verify it exists
    let assignedTeam = null;
    if (assignedTeamId) {
      assignedTeam = await prisma.team.findFirst({
        where: {
          id: assignedTeamId,
          organizationId,
        },
      });

      if (!assignedTeam) {
        return res.status(404).json({
          success: false,
          message: "Assigned team not found",
        });
      }

      // Employees cannot assign teams on creation
      if (role === "employee" && assignedTeamId !== sourceTeamId) {
        return res.status(403).json({
          success: false,
          message: "Employees cannot assign incidents to other teams",
        });
      }
    }

    // For employees, verify they belong to source team
    if (role === "employee") {
      const userTeamIds = await getUserTeamIds(userId);
      if (!userTeamIds.includes(sourceTeamId)) {
        return res.status(403).json({
          success: false,
          message: "You can only report incidents from teams you belong to",
        });
      }
    }

    // Create incident and room in transaction
    const result = await prisma.$transaction(async (tx) => {
      const incident = await tx.incident.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          category: category || "incident",
          priority: priority || "medium",
          status: "open",
          sourceTeamId,
          assignedTeamId: assignedTeamId || null,
          organizationId,
          createdById: userId,
        },
        include: {
          sourceTeam: {
            select: { id: true, name: true },
          },
          assignedTeam: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });

      // Create room for incident
      const room = await tx.room.create({
        data: {
          name: `🔴 ${title}`,
          type: "incident",
          organizationId,
          incidentId: incident.id,
        },
      });

      // Add participants: creator and assigned team members
      const participantIds = new Set([userId]);
      if (assignedTeamId) {
        const teamMembers = await tx.teamMember.findMany({
          where: { teamId: assignedTeamId },
          select: { userId: true },
        });
        teamMembers.forEach(m => participantIds.add(m.userId));
      }

      // Add all participants to room
      for (const pid of participantIds) {
        await tx.roomParticipant.create({
          data: { roomId: room.id, userId: pid },
        });
      }

      return { incident, room };
    });

    // Create incident log
    await createIncidentLog(
      result.incident.id,
      userId,
      "created",
      null,
      null,
      `Incident created by ${role}`
    );

    res.status(201).json({
      success: true,
      message: "Incident created successfully",
      data: {
        incident: result.incident,
        roomId: result.room.id,
      },
    });
  } catch (error) {
    console.error("[Incident] Create error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create incident",
      error: error.message,
    });
  }
};

/**
 * Get all incidents (with role-based filtering)
 */
export const getIncidents = async (req, res) => {
  try {
    const { status, priority, teamId, limit = 50, offset = 0 } = req.query;

    console.log('[getIncidents] req.user:', req.user);

    // Build base query with permissions
    let whereClause = await buildIncidentQuery(req);
    console.log('[getIncidents] whereClause:', whereClause);

    // Apply filters
    if (status) {
      whereClause.status = status;
    }
    if (priority) {
      whereClause.priority = priority;
    }
    if (teamId) {
      whereClause.OR = [
        { sourceTeamId: teamId },
        { assignedTeamId: teamId },
      ];
    }

    const incidents = await prisma.incident.findMany({
      where: whereClause,
      include: {
        sourceTeam: {
          select: { id: true, name: true },
        },
        assignedTeam: {
          select: { id: true, name: true },
        },
        assignedManager: {
          select: { id: true, fullName: true, email: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Get total count for pagination
    const total = await prisma.incident.count({ where: whereClause });

    // Format response
    const formattedIncidents = incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      category: incident.category,
      priority: incident.priority,
      status: incident.status,
      sourceTeam: incident.sourceTeam,
      assignedTeam: incident.assignedTeam,
      assignedManager: incident.assignedManager,
      createdBy: incident.createdBy,
      createdAt: incident.createdAt,
      updatedAt: incident.updatedAt,
      resolvedAt: incident.resolvedAt,
      closedAt: incident.closedAt,
      activityCount: incident._count.logs,
    }));

    res.json({
      success: true,
      data: {
        incidents: formattedIncidents,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      },
    });
  } catch (error) {
    console.error("[Incident] Get all error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch incidents",
      error: error.message,
    });
  }
};

/**
 * Get single incident by ID
 */
export const getIncidentById = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role, organizationId } = req.user;

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        sourceTeam: {
          select: { id: true, name: true, description: true },
        },
        assignedTeam: {
          select: { id: true, name: true, description: true },
        },
        assignedManager: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        createdBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
        logs: {
          include: {
            actor: {
              select: { id: true, fullName: true, role: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        rooms: {
          select: { id: true, name: true, createdAt: true },
        },
        attachments: {
          include: {
            uploadedBy: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    // Check permissions
    const canAccess = await canAccessIncident(req.user, incident);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view this incident",
      });
    }

    res.json({
      success: true,
      data: { incident },
    });
  } catch (error) {
    console.error("[Incident] Get by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch incident",
      error: error.message,
    });
  }
};

/**
 * Update incident details
 */
export const updateIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, priority } = req.body;
    const { userId, role, organizationId } = req.user;

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    // Check modification permissions
    const canModify = await canModifyIncident(req.user, incident);
    if (!canModify) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this incident",
      });
    }

    // Build update data
    const updateData = {};
    const logs = [];

    if (title !== undefined && title !== incident.title) {
      updateData.title = title.trim();
      logs.push({
        action: "title_updated",
        oldValue: incident.title,
        newValue: title.trim(),
      });
    }

    if (description !== undefined && description !== incident.description) {
      updateData.description = description?.trim() || null;
      logs.push({
        action: "description_updated",
        oldValue: incident.description,
        newValue: description?.trim() || null,
      });
    }

    if (category !== undefined && category !== incident.category) {
      updateData.category = category;
      // Category change logged in separate action if needed
    }

    if (priority !== undefined && priority !== incident.priority) {
      updateData.priority = priority;
      logs.push({
        action: "priority_changed",
        oldValue: incident.priority,
        newValue: priority,
      });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No changes provided",
      });
    }

    updateData.updatedAt = new Date();

    // Update incident
    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        sourceTeam: { select: { id: true, name: true } },
        assignedTeam: { select: { id: true, name: true } },
        assignedManager: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    // Create logs
    for (const log of logs) {
      await createIncidentLog(id, userId, log.action, log.oldValue, log.newValue);
    }

    res.json({
      success: true,
      message: "Incident updated successfully",
      data: { incident: updatedIncident },
    });
  } catch (error) {
    console.error("[Incident] Update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update incident",
      error: error.message,
    });
  }
};

/**
 * Change incident status
 */
export const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { userId, role, organizationId } = req.user;

    const validStatuses = ["open", "in_progress", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    if (incident.status === status) {
      return res.status(400).json({
        success: false,
        message: `Incident is already ${status}`,
      });
    }

    // Check permissions for status change
    const canModify = await canModifyIncident(req.user, incident);
    
    // Employees cannot change status
    if (role === "employee") {
      return res.status(403).json({
        success: false,
        message: "Employees cannot change incident status",
      });
    }

    // Only admins can close or reopen
    if ((status === "closed" || incident.status === "closed") && role !== "admin") {
      // Managers can resolve but not close/reopen
      if (status === "resolved") {
        // Allow manager to resolve
      } else {
        return res.status(403).json({
          success: false,
          message: "Only admins can close or reopen incidents",
        });
      }
    }

    if (!canModify && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to change this incident's status",
      });
    }

    // Build update data
    const updateData = {
      status,
      updatedAt: new Date(),
    };

    // Set timestamps based on status
    if (status === "resolved" && !incident.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    if (status === "closed" && !incident.closedAt) {
      updateData.closedAt = new Date();
    }
    if (status === "open" && incident.status === "closed") {
      // Reopening - clear closedAt
      updateData.closedAt = null;
    }

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: updateData,
      include: {
        sourceTeam: { select: { id: true, name: true } },
        assignedTeam: { select: { id: true, name: true } },
        assignedManager: { select: { id: true, fullName: true } },
      },
    });

    // Determine action type
    let action = "status_changed";
    if (status === "resolved") action = "resolved";
    if (status === "closed") action = "closed";
    if (incident.status === "closed" && status === "open") action = "reopened";

    await createIncidentLog(id, userId, action, incident.status, status);

    res.json({
      success: true,
      message: `Incident status changed to ${status}`,
      data: { incident: updatedIncident },
    });
  } catch (error) {
    console.error("[Incident] Change status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change incident status",
      error: error.message,
    });
  }
};

/**
 * Assign team to incident
 */
export const assignTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;
    const { userId, role, organizationId } = req.user;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: "Team ID is required",
      });
    }

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    // Check permissions
    const canModify = await canModifyIncident(req.user, incident);
    
    // Employees cannot assign teams
    if (role === "employee") {
      return res.status(403).json({
        success: false,
        message: "Employees cannot assign teams",
      });
    }

    if (!canModify && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to assign teams to this incident",
      });
    }

    // Verify team exists
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

    const oldTeamId = incident.assignedTeamId;

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        assignedTeamId: teamId,
        updatedAt: new Date(),
      },
      include: {
        sourceTeam: { select: { id: true, name: true } },
        assignedTeam: { select: { id: true, name: true } },
        assignedManager: { select: { id: true, fullName: true } },
      },
    });

    await createIncidentLog(
      id,
      userId,
      "team_assigned",
      oldTeamId || "none",
      teamId
    );

    res.json({
      success: true,
      message: "Team assigned successfully",
      data: { incident: updatedIncident },
    });
  } catch (error) {
    console.error("[Incident] Assign team error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign team",
      error: error.message,
    });
  }
};

/**
 * Assign manager to incident
 */
export const assignManager = async (req, res) => {
  try {
    const { id } = req.params;
    const { managerId } = req.body;
    const { userId, role, organizationId } = req.user;

    if (!managerId) {
      return res.status(400).json({
        success: false,
        message: "Manager ID is required",
      });
    }

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    // Check permissions
    const canModify = await canModifyIncident(req.user, incident);
    
    // Employees cannot assign managers
    if (role === "employee") {
      return res.status(403).json({
        success: false,
        message: "Employees cannot assign managers",
      });
    }

    if (!canModify && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to assign managers to this incident",
      });
    }

    // Verify manager exists and is a manager
    const manager = await prisma.user.findFirst({
      where: {
        id: managerId,
        organizationId,
        role: "manager",
      },
    });

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: "Manager not found",
      });
    }

    const oldManagerId = incident.assignedManagerId;

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        assignedManagerId: managerId,
        updatedAt: new Date(),
      },
      include: {
        sourceTeam: { select: { id: true, name: true } },
        assignedTeam: { select: { id: true, name: true } },
        assignedManager: { select: { id: true, fullName: true, email: true } },
      },
    });

    await createIncidentLog(
      id,
      userId,
      "manager_assigned",
      oldManagerId || "none",
      managerId
    );

    res.json({
      success: true,
      message: "Manager assigned successfully",
      data: { incident: updatedIncident },
    });
  } catch (error) {
    console.error("[Incident] Assign manager error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign manager",
      error: error.message,
    });
  }
};

/**
 * Resolve incident (shortcut for status change)
 */
export const resolveIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role, organizationId } = req.user;

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    if (incident.status === "resolved") {
      return res.status(400).json({
        success: false,
        message: "Incident is already resolved",
      });
    }

    if (incident.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Cannot resolve a closed incident. Reopen it first.",
      });
    }

    // Check permissions
    const canModify = await canModifyIncident(req.user, incident);

    // Employees cannot resolve
    if (role === "employee") {
      return res.status(403).json({
        success: false,
        message: "Employees cannot resolve incidents",
      });
    }

    if (!canModify && role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to resolve this incident",
      });
    }

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        sourceTeam: { select: { id: true, name: true } },
        assignedTeam: { select: { id: true, name: true } },
        assignedManager: { select: { id: true, fullName: true } },
      },
    });

    await createIncidentLog(id, userId, "resolved", incident.status, "resolved");

    res.json({
      success: true,
      message: "Incident resolved successfully",
      data: { incident: updatedIncident },
    });
  } catch (error) {
    console.error("[Incident] Resolve error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resolve incident",
      error: error.message,
    });
  }
};

/**
 * Close incident (admin only)
 */
export const closeIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role, organizationId } = req.user;

    // Only admins can close
    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can close incidents",
      });
    }

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    if (incident.status === "closed") {
      return res.status(400).json({
        success: false,
        message: "Incident is already closed",
      });
    }

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        status: "closed",
        closedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        sourceTeam: { select: { id: true, name: true } },
        assignedTeam: { select: { id: true, name: true } },
        assignedManager: { select: { id: true, fullName: true } },
      },
    });

    await createIncidentLog(id, userId, "closed", incident.status, "closed");

    res.json({
      success: true,
      message: "Incident closed successfully",
      data: { incident: updatedIncident },
    });
  } catch (error) {
    console.error("[Incident] Close error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to close incident",
      error: error.message,
    });
  }
};

/**
 * Reopen incident (admin only)
 */
export const reopenIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role, organizationId } = req.user;

    // Only admins can reopen
    if (role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can reopen incidents",
      });
    }

    const incident = await prisma.incident.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!incident) {
      return res.status(404).json({
        success: false,
        message: "Incident not found",
      });
    }

    if (incident.status !== "closed") {
      return res.status(400).json({
        success: false,
        message: "Only closed incidents can be reopened",
      });
    }

    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        status: "open",
        closedAt: null,
        updatedAt: new Date(),
      },
      include: {
        sourceTeam: { select: { id: true, name: true } },
        assignedTeam: { select: { id: true, name: true } },
        assignedManager: { select: { id: true, fullName: true } },
      },
    });

    await createIncidentLog(id, userId, "reopened", "closed", "open");

    res.json({
      success: true,
      message: "Incident reopened successfully",
      data: { incident: updatedIncident },
    });
  } catch (error) {
    console.error("[Incident] Reopen error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reopen incident",
      error: error.message,
    });
  }
};

/**
 * WORKFLOW A — STEP 1: Employee reports issue (creates PENDING REPORT)
 */
export const reportIncident = async (req, res) => {
  console.log(`[Incident] reportIncident called by user ${req.user.userId} (${req.user.role})`);
  try {
    const { title, description, category, priority, attachments = [] } = req.body;
    const { userId, organizationId } = req.user;

    // Validation
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Title must be at least 3 characters",
      });
    }

    // Get employee's team
    const userTeams = await prisma.teamMember.findMany({
      where: { userId },
      include: { team: { select: { id: true, name: true } } },
      take: 1,
    });

    if (userTeams.length === 0) {
      return res.status(400).json({
        success: false,
        message: "You must belong to a team to report incidents",
      });
    }

    const sourceTeamId = userTeams[0].team.id;

    // Create pending report with report_pending status
    const incident = await prisma.incident.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        category: category || "incident",
        priority: priority || "medium",
        status: "report_pending",
        sourceTeamId,
        organizationId,
        createdById: userId,
      },
      include: {
        sourceTeam: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    console.log(`[Incident] Created report with status: ${incident.status}`);

    // Create evidence attachments if provided
    if (Array.isArray(attachments) && attachments.length > 0) {
      await prisma.incidentAttachment.createMany({
        data: attachments.map((a) => ({
          incidentId: incident.id,
          uploadedById: userId,
          fileUrl: a.fileUrl,
          fileType: a.fileType || 'image/jpeg',
          fileName: a.fileName || null,
          fileSize: a.fileSize || null,
        })),
      });
    }

    await createIncidentLog(
      incident.id,
      userId,
      "report_created",
      null,
      null,
      "Incident report submitted for review"
    );

    res.status(201).json({
      success: true,
      message: "Incident report submitted for review",
      data: { incident },
    });
  } catch (error) {
    console.error("[Incident] Report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit incident report",
      error: error.message,
    });
  }
};

/**
 * WORKFLOW A — STEP 3: Manager/Admin approves report (creates ACTIVE incident)
 */
export const approveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      assignedTeamId,
      involvedTeamIds = [],
      assignedManagerId,
      priority,
      additionalParticipants = [],
      operationalNotes,
    } = req.body;
    const { userId, organizationId, role } = req.user;

    // Only managers/admins can approve
    if (role === "employee") {
      return res.status(403).json({
        success: false,
        message: "Only managers and admins can approve reports",
      });
    }

    // Find the pending report (open status with no assigned team)
    const report = await prisma.incident.findFirst({
      where: { 
        id, 
        organizationId, 
        status: "open",
        assignedTeamId: null
      },
      include: {
        sourceTeam: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Pending report not found",
      });
    }

    // Check manager access
    const userTeamIds = await getUserTeamIds(userId);
    if (role === "manager" &&
        !userTeamIds.includes(report.sourceTeamId) &&
        !(assignedTeamId && userTeamIds.includes(assignedTeamId))) {
      return res.status(403).json({
        success: false,
        message: "Can only approve reports from your teams",
      });
    }

    // Create incident room and update status in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update incident to active
      const incident = await tx.incident.update({
        where: { id },
        data: {
          status: "open",
          priority: priority || report.priority,
          assignedTeamId: assignedTeamId || null,
          assignedManagerId: assignedManagerId || null,
        },
        include: {
          sourceTeam: { select: { id: true, name: true } },
          assignedTeam: { select: { id: true, name: true } },
          assignedManager: { select: { id: true, fullName: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      // Create incident room
      const room = await tx.room.create({
        data: {
          name: `🔴 ${report.title}`,
          type: "incident",
          organizationId,
          incidentId: incident.id,
        },
      });

      // Add participants to room
      const participantIds = new Set([
        report.createdById, // Reporter
        userId, // Approver
        ...(assignedManagerId ? [assignedManagerId] : []),
        ...additionalParticipants,
      ]);

      // Add assigned team members
      if (assignedTeamId) {
        const teamMembers = await tx.teamMember.findMany({
          where: { teamId: assignedTeamId },
          select: { userId: true },
        });
        teamMembers.forEach(m => participantIds.add(m.userId));
      }

      // Add all involved team members
      const allTeamIds = [...new Set([...(involvedTeamIds || [])])];
      for (const tid of allTeamIds) {
        const members = await tx.teamMember.findMany({
          where: { teamId: tid },
          select: { userId: true },
        });
        members.forEach(m => participantIds.add(m.userId));
      }

      // Add all participants to room
      for (const pid of participantIds) {
        await tx.roomParticipant.create({
          data: { roomId: room.id, userId: pid },
        });
      }

      return { incident, room };
    });

    // Create audit logs
    await createIncidentLog(id, userId, "report_approved", "report_pending", "open", "Report approved and incident raised");
    if (assignedTeamId) {
      await createIncidentLog(id, userId, "team_assigned", null, assignedTeamId, `Assigned to team`);
    }
    if (assignedManagerId) {
      await createIncidentLog(id, userId, "manager_assigned", null, assignedManagerId, `Manager assigned`);
    }

    res.json({
      success: true,
      message: "Report approved and incident raised",
      data: {
        incident: result.incident,
        roomId: result.room.id,
      },
    });
  } catch (error) {
    console.error("[Incident] Approve error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve report",
      error: error.message,
    });
  }
};

/**
 * WORKFLOW A — STEP 3: Manager/Admin rejects report
 */
export const rejectReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { userId, organizationId, role } = req.user;

    // Only managers/admins can reject
    if (role === "employee") {
      return res.status(403).json({
        success: false,
        message: "Only managers and admins can reject reports",
      });
    }

    // Find the pending report
    const report = await prisma.incident.findFirst({
      where: { 
        id, 
        organizationId, 
        status: "report_pending",
      },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Pending report not found",
      });
    }

    // Check manager access
    const userTeamIds = await getUserTeamIds(userId);
    if (role === "manager" && !userTeamIds.includes(report.sourceTeamId)) {
      return res.status(403).json({
        success: false,
        message: "Can only reject reports from your teams",
      });
    }

    // Update to rejected
    const incident = await prisma.incident.update({
      where: { id },
      data: { status: "rejected" },
      include: {
        sourceTeam: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await createIncidentLog(id, userId, "report_rejected", "report_pending", "rejected", reason || "Report rejected");

    res.json({
      success: true,
      message: "Report rejected",
      data: { incident },
    });
  } catch (error) {
    console.error("[Incident] Reject error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject report",
      error: error.message,
    });
  }
};

/**
 * WORKFLOW B: Manager/Admin manually creates incident (ACTIVE immediately)
 */
export const createManualIncident = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      priority,
      sourceTeamId,
      assignedTeamId,
      involvedTeamIds = [],
      assignedManagerId,
      additionalParticipants = [],
      operationalNotes,
      attachments = [],
    } = req.body;
    const { userId, organizationId, role } = req.user;

    // Only managers/admins
    if (role === "employee") {
      return res.status(403).json({
        success: false,
        message: "Only managers and admins can manually create incidents",
      });
    }

    // Validation
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Title must be at least 3 characters",
      });
    }

    if (!sourceTeamId) {
      return res.status(400).json({
        success: false,
        message: "Source team is required",
      });
    }

    // Verify teams belong to organization
    const sourceTeam = await prisma.team.findFirst({
      where: { id: sourceTeamId, organizationId },
    });
    if (!sourceTeam) {
      return res.status(404).json({ success: false, message: "Source team not found" });
    }

    // Manager can only use their teams
    const userTeamIds = await getUserTeamIds(userId);
    if (role === "manager" && !userTeamIds.includes(sourceTeamId)) {
      return res.status(403).json({
        success: false,
        message: "Can only create incidents for your teams",
      });
    }

    // Collect all participant IDs BEFORE the transaction to avoid timeout
    const participantIdSet = new Set([
      userId,
      ...(assignedManagerId ? [assignedManagerId] : []),
      ...(Array.isArray(additionalParticipants) ? additionalParticipants : []),
    ]);

    // Fetch all team members in parallel outside the transaction
    const allTeamIds = [...new Set([
      ...(involvedTeamIds || []),
      sourceTeamId,
      ...(assignedTeamId ? [assignedTeamId] : []),
    ])];

    const teamMemberRows = await prisma.teamMember.findMany({
      where: { teamId: { in: allTeamIds } },
      select: { userId: true },
    });
    teamMemberRows.forEach(m => participantIdSet.add(m.userId));

    const participantIds = [...participantIdSet];

    // Create incident, room, and participants in a short transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create incident as ACTIVE
      const incident = await tx.incident.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          category: category || "incident",
          priority: priority || "medium",
          status: "open",
          sourceTeamId,
          assignedTeamId: assignedTeamId || null,
          assignedManagerId: assignedManagerId || null,
          organizationId,
          createdById: userId,
        },
        include: {
          sourceTeam: { select: { id: true, name: true } },
          assignedTeam: { select: { id: true, name: true } },
          assignedManager: { select: { id: true, fullName: true } },
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      // Create incident room
      const room = await tx.room.create({
        data: {
          name: `🔴 ${title}`,
          type: "incident",
          organizationId,
          incidentId: incident.id,
        },
      });

      // Batch-create all participant records in one query
      await tx.roomParticipant.createMany({
        data: participantIds.map(pid => ({ roomId: room.id, userId: pid })),
        skipDuplicates: true,
      });

      return { incident, room };
    }, { timeout: 30000 });

    // Save evidence attachments
    if (Array.isArray(attachments) && attachments.length > 0) {
      await prisma.incidentAttachment.createMany({
        data: attachments.map((a) => ({
          incidentId: result.incident.id,
          uploadedById: userId,
          fileUrl: a.fileUrl,
          fileType: a.fileType || 'image/jpeg',
          fileName: a.fileName || null,
          fileSize: a.fileSize ? parseInt(a.fileSize) : null,
        })),
      });
    }

    // Create audit logs
    await createIncidentLog(result.incident.id, userId, "created", null, null, "Manually created incident");
    if (assignedTeamId) {
      await createIncidentLog(result.incident.id, userId, "team_assigned", null, assignedTeamId);
    }
    if (assignedManagerId) {
      await createIncidentLog(result.incident.id, userId, "manager_assigned", null, assignedManagerId);
    }

    res.status(201).json({
      success: true,
      message: "Incident created and room initialized",
      data: {
        incident: result.incident,
        roomId: result.room.id,
      },
    });
  } catch (error) {
    console.error("[Incident] Manual create error:", error.message);
    console.error("[Incident] Manual create stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to create incident",
      error: error.message,
    });
  }
};
