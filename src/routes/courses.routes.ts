import express from "express";
import {
  addLesson,
  addSection,
  createCourse,
  getCourseDetail,
  getCoursePreview,
  getCourses,
  getMyCourses,
} from "../controllers/course.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createCourseSchema,
  addSectionSchema,
  // createLessonSchema
} from "../schemas/course.schema.js";
import { uploadImage, uploadMixed, uploadVideo } from "../config/cloudinary.js";

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get("/", getCourses);
// Course preview, before buying
router.get("/preview/:courseId", getCoursePreview);

// --- INSTRUCTOR/ADMIN ROUTES ---

// Create Course
router.post(
  "/",
  protect,
  authorize("INSTRUCTOR", "ADMIN"),
  uploadImage.single("thumbnail"),
  validate(createCourseSchema),
  createCourse,
);

router.get("/my-courses", protect, authorize("INSTRUCTOR"), getMyCourses);

// Add Section: Validate courseId in params and title in body
router.post(
  "/:courseId/sections",
  protect,
  authorize("INSTRUCTOR"),
  validate(addSectionSchema),
  addSection,
);

// Add Lesson
router.post(
  "/sections/:sectionId/lessons",
  protect,
  authorize("INSTRUCTOR"),
  uploadVideo.single("video"),
  addLesson,
);

router.get("/:courseId/full", protect, getCourseDetail);

export default router;
