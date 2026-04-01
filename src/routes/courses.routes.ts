import express from "express";
import {
  addLesson,
  addSection,
  createCourse,
  deleteCourse,
  deleteLesson,
  deleteSection,
  getCourseDetail,
  getCoursePreview,
  getCourses,
  getMyCourses,
  getMyEnrolledCourses,
  syncLessonDurations,
  updateCourse,
  updateLesson,
  updateSection,
  uploadLessonDocument,
} from "../controllers/course.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createCourseSchema,
  addSectionSchema,
  courseIdParamSchema,
  createLessonSchema,
  enrollInCourseSchema,
  updateSectionSchema,
  updateLessonSchema,
  lessonIdParamSchema,
  sectionIdParamSchema,
} from "../schemas/course.schema.js";
import { uploadDocument, uploadImage, uploadMixed, uploadVideo } from "../config/cloudinary.js";
import { enrollInCourse, getCoursePlayer, proxyLessonDocument } from "../controllers/enrollment.controller.js";

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get("/", getCourses);

// Course preview (before buying)
router.get("/preview/:courseId", validate(courseIdParamSchema), getCoursePreview);

// --- INSTRUCTOR ROUTES ---

// Create Course
router.post(
  "/",
  protect,
  authorize("INSTRUCTOR", "ADMIN"),
  uploadImage.single("thumbnail"),
  validate(createCourseSchema),
  createCourse,
);

// Get instructor's own courses
router.get("/my-courses", protect, authorize("INSTRUCTOR"), getMyCourses);

// Update Course (metadata + optional thumbnail)
router.patch(
  "/:courseId",
  protect,
  authorize("INSTRUCTOR"),
  uploadImage.single("thumbnail"),
  updateCourse,
);

// Delete Course
router.delete(
  "/:courseId",
  protect,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(courseIdParamSchema),
  deleteCourse,
);

// --- SECTION ROUTES ---

// Add Section
router.post(
  "/:courseId/sections",
  protect,
  authorize("INSTRUCTOR"),
  validate(addSectionSchema),
  addSection,
);

// Update Section (title / order)
router.patch(
  "/sections/:sectionId",
  protect,
  authorize("INSTRUCTOR"),
  validate(updateSectionSchema),
  updateSection,
);

// Delete Section
router.delete(
  "/sections/:sectionId",
  protect,
  authorize("INSTRUCTOR"),
  validate(sectionIdParamSchema),
  deleteSection,
);

// --- LESSON ROUTES ---

// Add Lesson (with optional video upload)
router.post(
  "/sections/:sectionId/lessons",
  protect,
  authorize("INSTRUCTOR"),
  uploadVideo.single("video"),
  validate(createLessonSchema),
  addLesson,
);

// Update Lesson (title, content, order, or replace video)
router.patch(
  "/lessons/:lessonId",
  protect,
  authorize("INSTRUCTOR"),
  uploadMixed.single("file"),
  validate(updateLessonSchema),
  updateLesson,
);

// Upload / replace PDF document on a lesson
router.post(
  "/lessons/:lessonId/document",
  protect,
  authorize("INSTRUCTOR"),
  uploadDocument.single("document"),
  validate(lessonIdParamSchema),
  uploadLessonDocument,
);

// Delete Lesson
router.delete(
  "/lessons/:lessonId",
  protect,
  authorize("INSTRUCTOR"),
  validate(lessonIdParamSchema),
  deleteLesson,
);

// --- STUDENT / SHARED ROUTES ---

// Full course detail (authenticated)
router.get("/:courseId/full", protect, validate(courseIdParamSchema), getCourseDetail);

// Enroll in course
router.post("/:courseId/enroll", protect, validate(enrollInCourseSchema), enrollInCourse);

// Student dashboard — enrolled courses
router.get("/enrolled/me", protect, getMyEnrolledCourses);

// Sync lesson durations from Cloudinary (fixes lessons with duration = 0)
router.post(
  "/:courseId/sync-durations",
  protect,
  authorize("INSTRUCTOR"),
  validate(courseIdParamSchema),
  syncLessonDurations,
);

// Course player (enrolled students only)
router.get("/:courseId/player", protect, validate(courseIdParamSchema), getCoursePlayer);

// Document proxy — streams Cloudinary raw files through the backend to avoid 401s
// protect middleware accepts token from header OR ?token= query param (needed for iframe src)
router.get("/lessons/:lessonId/document-proxy", protect, proxyLessonDocument);

export default router;
