import express from "express";
import { createCourse, getCourses } from "../controllers/course.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public: Anyone can see courses
router.get("/", getCourses);

// Private: Only Instructors can create
router.post("/", protect, authorize("INSTRUCTOR", "ADMIN"), createCourse);

export default router;
