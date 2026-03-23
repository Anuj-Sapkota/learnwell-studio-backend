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

const router = express.Router();

// Public: Anyone can see courses
router.get("/", getCourses);

// get course preview details
router.get("/preview/:courseId", getCoursePreview);

// Private: Only Instructors can create
router.post("/", protect, authorize("INSTRUCTOR", "ADMIN"), createCourse);

//  Get logged in instructor course
router.get("/my-courses", protect, authorize("INSTRUCTOR"), getMyCourses);

// Add Section to specific course
router.post(
  "/:courseId/sections",
  protect,
  authorize("INSTRUCTOR"),
  addSection,
);

// Add Lesson to specific section
router.post(
  "/sections/:sectionId/lessons",
  protect,
  authorize("INSTRUCTOR"),
  addLesson,
);

// Get full course content (for students to watch)
router.get("/:courseId/full", protect, getCourseDetail);

export default router;
