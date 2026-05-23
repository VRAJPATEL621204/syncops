import prisma from "../config/prisma.js";

// Check if user has required role(s)
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Not authenticated.",
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

// Admin only
export const adminOnly = authorize("admin");

// Admin and Manager
export const adminOrManager = authorize("admin", "manager");

// All authenticated users
export const anyRole = authorize("admin", "manager", "employee");

// Check if user belongs to organization
export const requireOrganization = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Not authenticated.",
      });
    }

    const { organizationId } = req.user;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: "User not associated with any organization",
      });
    }

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Attach organization to request
    req.organization = organization;

    next();
  } catch (error) {
    console.error("Organization middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify organization",
    });
  }
};

// Check if user can access specific organization resource
export const canAccessOrganization = (paramName = "organizationId") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Not authenticated.",
      });
    }

    const requestedOrgId = req.params[paramName] || req.body.organizationId;
    const userOrgId = req.user.organizationId;

    // Admin can access any organization (future multi-org support)
    if (req.user.role === "admin") {
      return next();
    }

    // Users can only access their own organization
    if (requestedOrgId && requestedOrgId !== userOrgId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Cannot access other organization's resources.",
      });
    }

    next();
  };
};
