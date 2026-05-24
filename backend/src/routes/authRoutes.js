import express from "express";
import {
  adminSignup,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  searchUsers,
} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { anyRole } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public routes
router.post("/admin/signup", adminSignup);
router.post("/login", login);

// Protected routes
router.post("/logout", authenticate, logout);
router.get("/profile", authenticate, anyRole, getProfile);
router.put("/profile", authenticate, anyRole, updateProfile);
router.put("/change-password", authenticate, anyRole, changePassword);
router.get("/users/search", authenticate, anyRole, searchUsers);

export default router;
