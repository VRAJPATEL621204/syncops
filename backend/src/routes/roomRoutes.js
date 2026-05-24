import express from "express";
import {
  getRooms,
  getRoomById,
  getRoomMessages,
  createDMRoom,
  getRoomParticipants,
  leaveRoom,
} from "../controllers/roomController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all rooms for current user
router.get("/", getRooms);

// Get single room details
router.get("/:id", getRoomById);

// Get room messages
router.get("/:id/messages", getRoomMessages);

// Get room participants
router.get("/:id/participants", getRoomParticipants);

// Create DM room
router.post("/dm", createDMRoom);

// Leave/Close a room (DMs only)
router.delete("/:id/leave", leaveRoom);

export default router;
