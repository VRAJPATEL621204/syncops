import prisma from "../config/prisma.js";

/**
 * Create organization-wide chat room
 */
export const createOrganizationRoom = async (organizationId, createdById) => {
  try {
    const existingRoom = await prisma.room.findFirst({
      where: {
        organizationId,
        type: "org",
      },
    });

    if (existingRoom) {
      return existingRoom;
    }

    const room = await prisma.room.create({
      data: {
        name: "Company Chat",
        type: "org",
        organizationId,
        createdById,
      },
    });

    console.log(`[RoomService] Created org room for organization ${organizationId}`);
    return room;
  } catch (error) {
    console.error("[RoomService] Create org room error:", error);
    throw error;
  }
};

/**
 * Create team chat room
 */
export const createTeamRoom = async (teamId, organizationId, createdById) => {
  try {
    const existingRoom = await prisma.room.findFirst({
      where: {
        teamId,
        type: "team",
      },
    });

    if (existingRoom) {
      return existingRoom;
    }

    // Get team name
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true },
    });

    const room = await prisma.room.create({
      data: {
        name: team?.name || "Team Chat",
        type: "team",
        organizationId,
        teamId,
        createdById,
      },
    });

    // Add all team members as participants
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId },
      select: { userId: true },
    });

    if (teamMembers.length > 0) {
      await prisma.roomParticipant.createMany({
        data: teamMembers.map((member) => ({
          roomId: room.id,
          userId: member.userId,
        })),
        skipDuplicates: true,
      });
    }

    console.log(`[RoomService] Created team room for team ${teamId}`);
    return room;
  } catch (error) {
    console.error("[RoomService] Create team room error:", error);
    throw error;
  }
};

/**
 * Add user to org room
 */
export const addUserToOrgRoom = async (userId, organizationId) => {
  try {
    const orgRoom = await prisma.room.findFirst({
      where: {
        organizationId,
        type: "org",
      },
    });

    if (!orgRoom) {
      // Create org room if it doesn't exist
      await createOrganizationRoom(organizationId, null);
      return;
    }

    // Check if already participant
    const existing = await prisma.roomParticipant.findFirst({
      where: {
        roomId: orgRoom.id,
        userId,
      },
    });

    if (!existing) {
      await prisma.roomParticipant.create({
        data: {
          roomId: orgRoom.id,
          userId,
        },
      });
      console.log(`[RoomService] Added user ${userId} to org room`);
    }
  } catch (error) {
    console.error("[RoomService] Add user to org room error:", error);
    throw error;
  }
};

/**
 * Add user to team room
 */
export const addUserToTeamRoom = async (userId, teamId) => {
  try {
    const teamRoom = await prisma.room.findFirst({
      where: {
        teamId,
        type: "team",
      },
    });

    if (!teamRoom) {
      // Team room will be created when team is created
      return;
    }

    // Check if already participant
    const existing = await prisma.roomParticipant.findFirst({
      where: {
        roomId: teamRoom.id,
        userId,
      },
    });

    if (!existing) {
      await prisma.roomParticipant.create({
        data: {
          roomId: teamRoom.id,
          userId,
        },
      });
      console.log(`[RoomService] Added user ${userId} to team room ${teamId}`);
    }
  } catch (error) {
    console.error("[RoomService] Add user to team room error:", error);
    throw error;
  }
};

/**
 * Remove user from team room
 */
export const removeUserFromTeamRoom = async (userId, teamId) => {
  try {
    const teamRoom = await prisma.room.findFirst({
      where: {
        teamId,
        type: "team",
      },
    });

    if (!teamRoom) return;

    await prisma.roomParticipant.deleteMany({
      where: {
        roomId: teamRoom.id,
        userId,
      },
    });

    console.log(`[RoomService] Removed user ${userId} from team room ${teamId}`);
  } catch (error) {
    console.error("[RoomService] Remove user from team room error:", error);
    throw error;
  }
};
