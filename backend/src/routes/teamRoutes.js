import express from "express";
import {
  createTeam,
  getTeams,
  getTeamById,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  getOrgMembers,
  removeFromOrganization,
} from "../controllers/teamController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Static routes MUST come before dynamic /:id routes
// Organization member management (admin only)
router.get("/org/members", getOrgMembers);
router.delete("/org/members", removeFromOrganization);

// Team membership (static paths — must be before /:id)
router.post("/members", addTeamMember);
router.delete("/members", removeTeamMember);

// Team CRUD
router.post("/", createTeam);
router.get("/", getTeams);
router.get("/:id", getTeamById);
router.delete("/:id", deleteTeam);

export default router;
