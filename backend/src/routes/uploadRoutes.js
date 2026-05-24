import express from "express";
import { upload, uploadMedia, uploadEvidence, uploadEvidenceImages } from "../controllers/uploadController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadMedia
);

router.post(
  "/evidence",
  authenticate,
  (req, res, next) => {
    uploadEvidence.array("files", 5)(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadEvidenceImages
);

export default router;
