import express from "express";
import {
  addLesson,
  addSection,
  createCourse,
  getCourseDetail,
  getCourses,
  getMyCreatedCourses,
} from "../controllers/course.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public: Anyone can see courses
router.get("/", getCourses);

// Private: Only Instructors can create
router.post("/", protect, authorize("INSTRUCTOR", "ADMIN"), createCourse);

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

router.get(
  "/instructor/my-courses",
  protect,
  authorize("INSTRUCTOR", "ADMIN"),
  getMyCreatedCourses,
);
export default router;
