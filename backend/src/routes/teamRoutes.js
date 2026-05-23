import express from "express";
import {
  createTeam,
  getTeams,
  getTeamById,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from "../controllers/teamController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Team CRUD
router.post("/", createTeam);
router.get("/", getTeams);
router.get("/:id", getTeamById);
router.delete("/:id", deleteTeam);

// Team membership
router.post("/members", addTeamMember);
router.delete("/members", removeTeamMember);

export default router;
