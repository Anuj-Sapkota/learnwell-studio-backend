import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// destructuring the info from .env
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
  process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error(
    "Cloudinary environment variables are missing! Check your .env file.",
  );
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

// Storage for images
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: "learnwell/thumbnails",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [{ width: 800, height: 450, crop: "fill" }], // 16:9 ratio
  }),
});

// Storage for Videos
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    resource_type: "video",
    folder: "learnwell/lessons",
    allowed_formats: ["mp4", "mkv", "mov"],
    chunk_size: 6000000, // 6MB chunks for smoother upload
  }),
});

// Mixed uploads for routes with both image and video uploads
const mixedStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Check if the file is a video
    const isVideo = file.mimetype.startsWith("video");

    return {
      folder: isVideo ? "learnwell/lessons" : "learnwell/thumbnails",
      resource_type: isVideo ? "video" : "image", // CRITICAL: This tells Cloudinary what to expect
      allowed_formats: isVideo
        ? ["mp4", "mkv", "mov"]
        : ["jpg", "jpeg", "png", "webp"],
      // Only apply transformations to images
      transformation: isVideo
        ? undefined
        : [{ width: 800, height: 450, crop: "fill" }],
    };
  },
});

// Storage for Documents (PDF, PPT, code files etc.) — resource_type "raw" for non-media files
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req, file) => ({
    resource_type: "raw",
    folder: "learnwell/documents",
    public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
  }),
});

// Storage that routes video to video storage and documents to raw storage
const lessonStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req, file) => {
    const isVideo = file.mimetype.startsWith("video/");
    return {
      resource_type: isVideo ? "video" : "raw",
      folder: isVideo ? "learnwell/lessons" : "learnwell/documents",
      ...(isVideo && {
        allowed_formats: ["mp4", "mkv", "mov"],
        chunk_size: 6000000,
      }),
      ...(!isVideo && {
        public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
      }),
    };
  },
});

// uploads assignment with file types as all
const assignmentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req, file) => {
    const isVideo = file.mimetype.startsWith("video/");
    const isImage = file.mimetype.startsWith("image/");

    return {
      resource_type: isVideo ? "video" : isImage ? "image" : "raw",
      folder: "learnwell/assignments",
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
    };
  },
});

// Storage for student assignment submissions
const submissionStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req, file) => {
    const isVideo = file.mimetype.startsWith("video/");
    const isImage = file.mimetype.startsWith("image/");
    return {
      resource_type: isVideo ? "video" : isImage ? "image" : "raw",
      folder: "learnwell/submissions",
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
    };
  },
});

// Storage for instructor signatures — PNG with transparency preserved
const signatureStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req, _file) => ({
    folder: "learnwell/signatures",
    allowed_formats: ["png", "jpg", "jpeg", "webp"],
    // Remove background and convert to PNG to preserve transparency
    transformation: [
      { background_removal: "cloudinary_ai" },
      { width: 400, crop: "limit" },
      { format: "png" },
    ],
  }),
});

const MB = 1024 * 1024;

export const uploadImage = multer({ storage: imageStorage, limits: { fileSize: 5 * MB } });
export const uploadVideo = multer({ storage: videoStorage, limits: { fileSize: 500 * MB } });
export const uploadMixed = multer({ storage: mixedStorage, limits: { fileSize: 500 * MB } });
export const uploadDocument = multer({ storage: documentStorage, limits: { fileSize: 20 * MB } });
export const uploadLesson = multer({ storage: lessonStorage, limits: { fileSize: 500 * MB } });
export const uploadAssignment = multer({ storage: assignmentStorage, limits: { fileSize: 20 * MB } });
export const uploadSubmission = multer({ storage: submissionStorage, limits: { fileSize: 20 * MB } });
export const uploadSignature = multer({ storage: signatureStorage, limits: { fileSize: 2 * MB } });
