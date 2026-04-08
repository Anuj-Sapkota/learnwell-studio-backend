import express from "express";
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getCourseAssignments,
  submitAssignment,
  getSubmissions,
  getMySubmission,
  gradeSubmission,
} from "../controllers/assignment.controller.js";
import {
  protect,
  authorize,
  requireVerified,
} from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
  assignmentIdParamSchema,
  submitAssignmentSchema,
  gradeSubmissionSchema,
} from "../schemas/assignment.schema.js";
import { courseIdParamSchema } from "../schemas/course.schema.js";
import { uploadAssignment, uploadSubmission } from "../config/cloudinary.js";

const router = express.Router();

// ── Instructor routes ─────────────────────────────────────────────────────────
router.post(
  "/courses/:courseId",
  protect,
  requireVerified,
  authorize("INSTRUCTOR"),
  uploadAssignment.array("files", 4), // instructor uploads questions here
  validate(createAssignmentSchema),
  createAssignment,
);

router.patch(
  "/:assignmentId",
  protect,
  requireVerified,
  authorize("INSTRUCTOR"),
  validate(updateAssignmentSchema),
  updateAssignment,
);

router.delete(
  "/:assignmentId",
  protect,
  requireVerified,
  authorize("INSTRUCTOR"),
  validate(assignmentIdParamSchema),
  deleteAssignment,
);

// View all submissions for an assignment
router.get(
  "/:assignmentId/submissions",
  protect,
  authorize("INSTRUCTOR"),
  validate(assignmentIdParamSchema),
  getSubmissions,
);

// Grade a specific submission
router.patch(
  "/submissions/:submissionId/grade",
  protect,
  authorize("INSTRUCTOR"),
  validate(gradeSubmissionSchema),
  gradeSubmission,
);

// ── Shared routes ─────────────────────────────────────────────────────────────

// Get all assignments for a course (enrolled students + instructor)
router.get(
  "/courses/:courseId",
  protect,
  requireVerified,
  validate(courseIdParamSchema),
  getCourseAssignments,
);

// ── Student routes ────────────────────────────────────────────────────────────

// Submit assignment (text or file)
router.post(
  "/:assignmentId/submit",
  protect,
  requireVerified,
  uploadSubmission.single("file"),
  validate(submitAssignmentSchema),
  submitAssignment,
);

// Get own submission
router.get(
  "/:assignmentId/my-submission",
  protect,
  validate(assignmentIdParamSchema),
  getMySubmission,
);

export default router;
