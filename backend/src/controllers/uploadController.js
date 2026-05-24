import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";
import prisma from "../config/prisma.js";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpg", "image/jpeg", "image/webp", "image/gif"];
const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"];
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024; // 10MB per image
const MAX_EVIDENCE_COUNT = 5;

// Use memory storage — buffer goes straight to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const mime = file.mimetype || '';
  if (mime.startsWith('image/') || mime.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${mime}`), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_AUDIO_SIZE },
});

// Upload buffer to Cloudinary via stream
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    Readable.from(buffer).pipe(uploadStream);
  });
};

export const uploadMedia = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  try {
    const mime = req.file.mimetype || '';
    const isImage = mime.startsWith('image/');
    const isAudio = mime.startsWith('audio/');

    if (!isImage && !isAudio) {
      return res.status(400).json({ success: false, message: `Unsupported file type: ${mime}` });
    }

    // Images: resource_type=image | Audio: resource_type=video
    // Cloudinary serves webm audio with correct Content-Type under "video" resource type
    // Under "raw" it serves as application/octet-stream which browsers refuse to play
    const resourceType = isImage ? "image" : "video";

    let uploadOptions = { resource_type: resourceType };
    if (isImage) {
      uploadOptions.folder = "syncops/images";
    } else {
      // Use folder only — let Cloudinary generate unique public_id
      uploadOptions.folder = "syncops/audio";
    }

    const result = await uploadToCloudinary(req.file.buffer, uploadOptions);
    const messageType = isImage ? 'image' : 'audio';

    console.log(`[Upload] ${messageType} uploaded: ${result.secure_url}`);

    res.status(200).json({
      success: true,
      data: {
        mediaUrl: result.secure_url,
        mimeType: mime,
        type: messageType,
        size: result.bytes,
        publicId: result.public_id,
      },
    });
  } catch (error) {
    console.error("[Upload] Cloudinary error:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
};

// Evidence upload — images only, up to 5 files
const evidenceFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`Only image files are allowed for evidence`), false);
  }
};

export const uploadEvidence = multer({
  storage: multer.memoryStorage(),
  fileFilter: evidenceFileFilter,
  limits: { fileSize: MAX_EVIDENCE_SIZE },
});

export const uploadEvidenceImages = async (req, res) => {
  const files = req.files;
  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: "No files uploaded" });
  }
  if (files.length > MAX_EVIDENCE_COUNT) {
    return res.status(400).json({ success: false, message: `Maximum ${MAX_EVIDENCE_COUNT} images allowed` });
  }

  try {
    const uploads = await Promise.all(
      files.map((file) =>
        uploadToCloudinary(file.buffer, {
          resource_type: "image",
          folder: "syncops/evidence",
        }).then((result) => ({
          fileUrl: result.secure_url,
          fileType: file.mimetype,
          fileName: file.originalname,
          fileSize: result.bytes,
          publicId: result.public_id,
        }))
      )
    );

    console.log(`[Upload] ${uploads.length} evidence image(s) uploaded`);
    res.status(200).json({ success: true, data: { attachments: uploads } });
  } catch (error) {
    console.error("[Upload] Evidence upload error:", error);
    res.status(500).json({ success: false, message: "Evidence upload failed" });
  }
};
