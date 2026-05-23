import express from "express";
import {
  createInvite,
  validateInvite,
  acceptInvite,
  listInvites,
  cancelInvite,
  resendInvite,
} from "../controllers/inviteController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { adminOrManager, anyRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public routes (no auth required)
router.get("/validate", validateInvite); // Check if invite is valid
router.post("/accept", acceptInvite);    // Accept invitation & create account

// Protected routes (auth required)
router.post("/", authenticate, adminOrManager, createInvite);      // Create invitation
router.get("/", authenticate, adminOrManager, listInvites);        // List invitations
router.delete("/:inviteId", authenticate, cancelInvite);            // Cancel invitation
router.post("/:inviteId/resend", authenticate, adminOrManager, resendInvite); // Resend invitation

export default router;
