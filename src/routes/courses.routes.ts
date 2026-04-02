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
import { protect, authorize, requireVerified } from "../middleware/auth.middleware.js";
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

// -------------------------------------------------------
// STATIC ROUTES FIRST — must come before any /:courseId
// routes otherwise Express matches the static segment as
// a param value (e.g. "enrolled" becomes courseId).
// -------------------------------------------------------

// Public
router.get("/", getCourses);
router.get("/preview/:courseId", validate(courseIdParamSchema), getCoursePreview);

// Instructor
router.get("/my-courses", protect, authorize("INSTRUCTOR"), getMyCourses);

// Student
router.get("/enrolled/me", protect, getMyEnrolledCourses);

// Lesson sub-routes (static prefix "sections" / "lessons")
router.post(
  "/sections/:sectionId/lessons",
  protect,
  requireVerified,
  authorize("INSTRUCTOR"),
  uploadVideo.single("video"),
  validate(createLessonSchema),
  addLesson,
);
router.patch(
  "/sections/:sectionId",
  protect,
  requireVerified,
  authorize("INSTRUCTOR"),
  validate(updateSectionSchema),
  updateSection,
);
router.delete(
  "/sections/:sectionId",
  protect,
  requireVerified,
  authorize("INSTRUCTOR"),
  validate(sectionIdParamSchema),
  deleteSection,
);
router.patch(
  "/lessons/:lessonId",
  protect,
  requireVerified,
  authorize("INSTRUCTOR"),
  uploadMixed.single("file"),
  validate(updateLessonSchema),
  updateLesson,
);
router.post(
  "/lessons/:lessonId/document",
  protect,
  requireVerified,
  authorize("INSTRUCTOR"),
  uploadDocument.single("document"),
  validate(lessonIdParamSchema),
  uploadLessonDocument,
);
router.delete(
  "/lessons/:lessonId",
  protect,
  requireVerified,
  authorize("INSTRUCTOR"),
  validate(lessonIdParamSchema),
  deleteLesson,
);
// Document proxy (token via header or ?token= query param for iframe)
router.get("/lessons/:lessonId/document-proxy", protect, proxyLessonDocument);

// -------------------------------------------------------
// DYNAMIC /:courseId ROUTES — after all static routes
// -------------------------------------------------------

router.post(
  "/",
  protect,
  requireVerified,
  authorize("INSTRUCTOR", "ADMIN"),
  uploadImage.single("thumbnail"),
  validate(createCourseSchema),
  createCourse,
);
router.patch(
  "/:courseId",
  protect,
  requireVerified,
  authorize("INSTRUCTOR"),
  uploadImage.single("thumbnail"),
  updateCourse,
);
router.delete(
  "/:courseId",
  protect,
  requireVerified,
  authorize("INSTRUCTOR", "ADMIN"),
  validate(courseIdParamSchema),
  deleteCourse,
);
router.post(
  "/:courseId/sections",
  protect,
  requireVerified,
  authorize("INSTRUCTOR"),
  validate(addSectionSchema),
  addSection,
);
router.get(
  "/:courseId/full",
  protect,
  requireVerified,
  validate(courseIdParamSchema),
  getCourseDetail,
);
router.post(
  "/:courseId/enroll",
  protect,
  requireVerified,
  validate(enrollInCourseSchema),
  enrollInCourse,
);
router.post(
  "/:courseId/sync-durations",
  protect,
  authorize("INSTRUCTOR"),
  validate(courseIdParamSchema),
  syncLessonDurations,
);
router.get(
  "/:courseId/player",
  protect,
  validate(courseIdParamSchema),
  getCoursePlayer,
);

export default router;
