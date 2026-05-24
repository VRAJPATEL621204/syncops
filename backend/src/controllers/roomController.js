import prisma from "../config/prisma.js";
import { decrypt } from "../utils/crypto.js";
import { broadcastToRoom } from "../config/socket.js";
import { createOrganizationRoom, addUserToOrgRoom, createTeamRoom, addUserToTeamRoom } from "../services/roomService.js";

/**
 * Get all rooms for the current user
 * Includes: org room, team rooms, and DMs
 */
export const getRooms = async (req, res) => {
  try {
    const { userId, organizationId, role } = req.user;

    // Step 1: fetch org room + user's teams in parallel
    const [existingOrgRoom, userTeams] = await Promise.all([
      prisma.room.findFirst({ where: { organizationId, type: "org" } }),
      prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } }),
    ]);

    // Auto-create org room only if missing
    if (!existingOrgRoom) {
      await createOrganizationRoom(organizationId, userId);
    }

    const teamIds = userTeams.map((t) => t.teamId);

    // Step 2: check existing team rooms in ONE query
    const existingTeamRooms = await prisma.room.findMany({
      where: { teamId: { in: teamIds }, type: "team" },
      select: { teamId: true },
    });
    const existingTeamRoomSet = new Set(existingTeamRooms.map((r) => r.teamId));
    const missingTeamIds = teamIds.filter((id) => !existingTeamRoomSet.has(id));

    // Step 3: create missing rooms + add user to all rooms — all in parallel
    await Promise.all([
      addUserToOrgRoom(userId, organizationId),
      ...missingTeamIds.map((teamId) => createTeamRoom(teamId, organizationId, userId)),
      ...teamIds.map((teamId) => addUserToTeamRoom(userId, teamId)),
    ]);

    // Step 4: fetch org room with participants
    const orgRoom = await prisma.room.findFirst({
      where: { organizationId, type: "org" },
      include: {
        participants: { where: { userId }, select: { lastReadAt: true } },
        _count: { select: { messages: true } },
      },
    });

    // Get team rooms
    const teamRooms = await prisma.room.findMany({
      where: {
        organizationId,
        type: "team",
        teamId: { in: teamIds },
      },
      include: {
        team: {
          select: { id: true, name: true },
        },
        participants: {
          where: { userId },
          select: { lastReadAt: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    // Get DM rooms
    const dmRooms = await prisma.room.findMany({
      where: {
        organizationId,
        type: "dm",
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    // Format DMs to show other participant
    const formattedDMs = dmRooms.map((room) => {
      const otherParticipant = room.participants.find(
        (p) => p.userId !== userId
      )?.user;
      return {
        id: room.id,
        name: otherParticipant?.fullName || "Unknown",
        type: "dm",
        otherUser: otherParticipant,
        participantCount: room.participants.length,
        messageCount: room._count.messages,
      };
    });

    // Get incident rooms (for participants AND admins, exclude archived/resolved)
    let formattedIncidentRooms = [];
    try {
      // Admins see all incident rooms in org, others only see where they're participants
      const whereClause = {
        organizationId,
        type: "incident",
      };
      
      if (role !== 'admin') {
        whereClause.participants = {
          some: { userId },
        };
      }

      const incidentRooms = await prisma.room.findMany({
        where: whereClause,
        include: {
          incident: {
            select: {
              id: true,
              status: true,
              priority: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      });

      // Filter out resolved/closed/rejected/pending in JavaScript
      const activeIncidentRooms = incidentRooms.filter(
        (room) => room.incident && 
        !["resolved", "closed", "rejected", "report_pending"].includes(room.incident.status)
      );

      formattedIncidentRooms = activeIncidentRooms.map((room) => ({
        id: room.id,
        name: room.name,
        type: "incident",
        incidentId: room.incidentId,
        status: room.incident?.status,
        priority: room.incident?.priority,
        messageCount: room._count.messages,
      }));
    } catch (err) {
      console.error("[Room] Failed to fetch incident rooms:", err.message);
    }

    res.json({
      success: true,
      data: {
        orgRoom: orgRoom
          ? {
              id: orgRoom.id,
              name: orgRoom.name,
              type: "org",
              participantCount: orgRoom._count.messages,
            }
          : null,
        teamRooms: teamRooms.map((room) => ({
          id: room.id,
          name: room.team?.name || room.name,
          type: "team",
          teamId: room.teamId,
          participantCount: room._count.messages,
        })),
        dmRooms: formattedDMs,
        incidentRooms: formattedIncidentRooms,
      },
    });
  } catch (error) {
    console.error("[Room] Get rooms error:", error);
    console.error("[Room] Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
      error: error.message,
    });
  }
};

/**
 * Get single room details
 */
export const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, organizationId } = req.user;

    const room = await prisma.room.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        team: {
          select: { id: true, name: true },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                profileImage: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Check permission
    const isParticipant = room.participants.some((p) => p.userId === userId);
    const isOrgRoom = room.type === "org";
    const isAdmin = req.user.role === "admin";

    if (!isParticipant && !isOrgRoom && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this room",
      });
    }

    // For DMs, show other user's name
    let displayName = room.name;
    if (room.type === "dm") {
      const otherParticipant = room.participants.find(
        (p) => p.userId !== userId
      )?.user;
      displayName = otherParticipant?.fullName || "Unknown";
    } else if (room.type === "team" && room.team) {
      displayName = room.team.name;
    }

    res.json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: displayName,
          type: room.type,
          teamId: room.teamId,
          createdAt: room.createdAt,
          participantCount: room.participants.length,
          messageCount: room._count.messages,
          participants: room.participants.map((p) => ({
            id: p.user.id,
            fullName: p.user.fullName,
            email: p.user.email,
            profileImage: p.user.profileImage,
            role: p.user.role,
            joinedAt: p.joinedAt,
          })),
        },
      },
    });
  } catch (error) {
    console.error("[Room] Get room error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch room",
    });
  }
};

/**
 * Get room messages
 */
export const getRoomMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, organizationId } = req.user;
    const { limit = 50, before } = req.query;

    // Verify room access
    const room = await prisma.room.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        participants: {
          where: { userId },
        },
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const isParticipant = room.participants.length > 0 || room.type === "org";
    const isAdmin = req.user.role === "admin";

    if (!isParticipant && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view messages",
      });
    }

    // Build query
    const whereClause = {
      roomId: id,
      isDeleted: false,
    };

    if (before) {
      whereClause.createdAt = {
        lt: new Date(before),
      };
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    // Update lastReadAt
    if (room.participants.length > 0) {
      await prisma.roomParticipant.update({
        where: { id: room.participants[0].id },
        data: { lastReadAt: new Date() },
      });
    }

    res.json({
      success: true,
      data: {
        messages: messages.reverse().map((msg) => ({
          id: msg.id,
          content: decrypt(msg.content),
          type: msg.type,
          mediaUrl: msg.mediaUrl,
          mimeType: msg.mimeType,
          duration: msg.duration,
          sender: msg.sender,
          createdAt: msg.createdAt,
          editedAt: msg.editedAt,
        })),
      },
    });
  } catch (error) {
    console.error("[Room] Get messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};

/**
 * Create or get DM room
 */
export const createDMRoom = async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "targetUserId is required",
      });
    }

    if (targetUserId === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot create DM with yourself",
      });
    }

    // Check if target user exists in same org
    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        organizationId,
      },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in organization",
      });
    }

    // Check if DM already exists between these two users
    // Find rooms where both users are participants and there are exactly 2 participants
    const existingRoom = await prisma.room.findFirst({
      where: {
        organizationId,
        type: "dm",
        AND: [
          {
            participants: {
              some: { userId },
            },
          },
          {
            participants: {
              some: { userId: targetUserId },
            },
          },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    // Verify it has exactly 2 participants (not a group chat)
    if (existingRoom && existingRoom.participants.length === 2) {
      const otherParticipant = existingRoom.participants.find(
        (p) => p.userId !== userId
      )?.user;

      return res.json({
        success: true,
        data: {
          room: {
            id: existingRoom.id,
            name: otherParticipant?.fullName || "Unknown",
            type: "dm",
            otherUser: otherParticipant,
            isNew: false,
          },
        },
      });
    }

    // Create new DM room
    const room = await prisma.room.create({
      data: {
        name: `DM: ${userId} - ${targetUserId}`,
        type: "dm",
        organizationId,
        createdById: userId,
        participants: {
          create: [
            { userId },
            { userId: targetUserId },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    const otherParticipant = room.participants.find(
      (p) => p.userId !== userId
    )?.user;

    res.status(201).json({
      success: true,
      data: {
        room: {
          id: room.id,
          name: otherParticipant?.fullName || "Unknown",
          type: "dm",
          otherUser: otherParticipant,
          isNew: true,
        },
      },
    });
  } catch (error) {
    console.error("[Room] Create DM error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create DM room",
    });
  }
};

/**
 * Get room participants
 */
export const getRoomParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, organizationId } = req.user;

    // Verify room access
    const room = await prisma.room.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        participants: {
          where: { userId },
        },
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const isParticipant =
      room.participants.length > 0 || room.type === "org";

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const participants = await prisma.roomParticipant.findMany({
      where: { roomId: id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
            role: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        participants: participants.map((p) => ({
          id: p.user.id,
          fullName: p.user.fullName,
          email: p.user.email,
          profileImage: p.user.profileImage,
          role: p.user.role,
          joinedAt: p.joinedAt,
        })),
      },
    });
  } catch (error) {
    console.error("[Room] Get participants error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch participants",
    });
  }
};

/**
 * Leave a room (remove self from participants)
 * For DMs: hides the chat from user's sidebar permanently
 */
export const leaveRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, organizationId } = req.user;

    // Find the room and verify it belongs to this org
    const room = await prisma.room.findFirst({
      where: { id, organizationId },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Cannot leave org or team rooms - only DMs
    if (room.type !== "dm") {
      return res.status(400).json({
        success: false,
        message: "Can only close direct message chats",
      });
    }

    // Remove user from room participants (idempotent — ok if already removed)
    await prisma.roomParticipant.deleteMany({
      where: { roomId: id, userId },
    });

    res.json({
      success: true,
      message: "Chat closed successfully",
    });
  } catch (error) {
    console.error("[Room] Leave room error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to close chat",
    });
  }
};
