import express from "express";
import {
  addLesson,
  addSection,
  createCourse,
  getCourseDetail,
  getCoursePreview,
  getCourses,
  getMyCourses,
  getMyEnrolledCourses,
} from "../controllers/course.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createCourseSchema,
  addSectionSchema,
  courseIdParamSchema,
  createLessonSchema,
  enrollInCourseSchema,
  // createLessonSchema
} from "../schemas/course.schema.js";
import { uploadImage, uploadMixed, uploadVideo } from "../config/cloudinary.js";
import { enrollInCourse } from "../controllers/enrollment.controller.js";

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get("/", getCourses);

// Course preview, before buying
router.get(
  "/preview/:courseId", 
  validate(courseIdParamSchema), 
  getCoursePreview
);

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
  validate(createLessonSchema),
  addLesson,
);

// get course details in depth
router.get("/:courseId/full", protect, validate(courseIdParamSchema), getCourseDetail);

//enroll in course
router.post("/:courseId/enroll", protect, validate(enrollInCourseSchema), enrollInCourse);

// Student Dashboard
router.get("/enrolled/me", protect, getMyEnrolledCourses);

// The Course Player (Logic for sections + lessons + access control)

export default router;
