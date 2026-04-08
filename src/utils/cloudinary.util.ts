import { v2 as cloudinary } from "cloudinary";

type ResourceType = "image" | "video" | "raw";

/**
 * Extracts the Cloudinary public_id from a Cloudinary URL.
 * Works for image, video, and raw resource types.
 */
export const extractPublicId = (url: string): string | null => {
  try {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex === -1) return null;
    const afterUpload = url.slice(uploadIndex + 8);
    const withoutVersion = afterUpload.replace(/^v\d+\//, "");
    return withoutVersion.replace(/\.[^/.]+$/, "");
  } catch {
    return null;
  }
};

/**
 * Deletes a single Cloudinary asset. Silently ignores errors.
 */
export const deleteFromCloudinary = (url: string, resourceType: ResourceType): Promise<void> => {
  const publicId = extractPublicId(url);
  if (!publicId) return Promise.resolve();
  return cloudinary.uploader
    .destroy(publicId, { resource_type: resourceType })
    .then(() => {})
    .catch((err) => console.error(`Cloudinary delete failed [${resourceType}] ${publicId}:`, err));
};

/**
 * Deletes multiple Cloudinary assets of the same resource type in one API call.
 */
export const deleteManyFromCloudinary = (urls: string[], resourceType: ResourceType): Promise<void> => {
  const publicIds = urls.map(extractPublicId).filter(Boolean) as string[];
  if (publicIds.length === 0) return Promise.resolve();
  return cloudinary.api
    .delete_resources(publicIds, { resource_type: resourceType })
    .then(() => {})
    .catch((err) => console.error(`Cloudinary bulk delete failed [${resourceType}]:`, err));
};
