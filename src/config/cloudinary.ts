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

export const uploadImage = multer({ storage: imageStorage });
export const uploadVideo = multer({ storage: videoStorage });
export const uploadMixed = multer({ storage: mixedStorage });
