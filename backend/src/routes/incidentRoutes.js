import express from "express";
import {
  createIncident,
  getIncidents,
  getIncidentById,
  updateIncident,
  changeStatus,
  assignTeam,
  assignManager,
  resolveIncident,
  closeIncident,
  reopenIncident,
  reportIncident,
  approveReport,
  rejectReport,
  createManualIncident,
} from "../controllers/incidentController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Static POST routes MUST come before dynamic /:id routes
router.post("/", createIncident);
router.post("/report", reportIncident);           // Employee creates pending report
router.post("/manual", createManualIncident);     // Directly create active incident

// GET routes
router.get("/", getIncidents);
router.get("/:id", getIncidentById);

// Dynamic /:id routes
router.patch("/:id", updateIncident);
router.post("/:id/approve", approveReport);       // Manager approves and raises incident
router.post("/:id/reject", rejectReport);         // Manager rejects report

// Incident lifecycle
router.patch("/:id/status", changeStatus);
router.patch("/:id/resolve", resolveIncident);
router.patch("/:id/close", closeIncident);
router.patch("/:id/reopen", reopenIncident);

// Assignments
router.patch("/:id/assign-team", assignTeam);
router.patch("/:id/assign-manager", assignManager);

export default router;
