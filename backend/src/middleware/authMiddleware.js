import { verifyToken } from "../utils/jwt.js";

const extractToken = (req) => {
  // 1. HttpOnly cookie (primary)
  if (req.cookies?.token) return req.cookies.token;
  // 2. Authorization header fallback (used by invite accept flow)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.split(" ")[1];
  return null;
};

export const authenticate = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Optional auth - doesn't require token but attaches user if present
export const optionalAuth = (req, res, next) => {
  try {
    const token = extractToken(req);
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) req.user = decoded;
    }
    next();
  } catch (error) {
    next();
  }
};
