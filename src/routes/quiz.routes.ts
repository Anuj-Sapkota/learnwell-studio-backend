import express from "express";
import {
  addQuestion, getQuestionBank, updateQuestion, deleteQuestion,
  createQuiz, updateQuiz, deleteQuiz, getCourseQuizzes,
  getQuizForStudent, submitQuiz, getMyAttempts,
  getQuizAttempts, gradeQuizAttempt,
} from "../controllers/quiz.controller.js";
import { protect, authorize, requireVerified } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  addQuestionSchema, questionIdParamSchema,
  createQuizSchema, updateQuizSchema, quizIdParamSchema, submitQuizSchema,
} from "../schemas/quiz.schema.js";
import { courseIdParamSchema } from "../schemas/course.schema.js";

const router = express.Router();

// ── Question Bank (Instructor) ────────────────────────────────────────────────
router.get("/courses/:courseId/questions", protect, authorize("INSTRUCTOR"), validate(courseIdParamSchema), getQuestionBank);
router.post("/courses/:courseId/questions", protect, requireVerified, authorize("INSTRUCTOR"), validate(addQuestionSchema), addQuestion);
router.patch("/questions/:questionId", protect, authorize("INSTRUCTOR"), validate(questionIdParamSchema), updateQuestion);
router.delete("/questions/:questionId", protect, authorize("INSTRUCTOR"), validate(questionIdParamSchema), deleteQuestion);

// ── Quiz CRUD (Instructor) ────────────────────────────────────────────────────
router.post("/courses/:courseId", protect, requireVerified, authorize("INSTRUCTOR"), validate(createQuizSchema), createQuiz);
router.patch("/:quizId", protect, authorize("INSTRUCTOR"), validate(updateQuizSchema), updateQuiz);
router.delete("/:quizId", protect, authorize("INSTRUCTOR"), validate(quizIdParamSchema), deleteQuiz);

// ── Shared ────────────────────────────────────────────────────────────────────
router.get("/courses/:courseId", protect, requireVerified, validate(courseIdParamSchema), getCourseQuizzes);

// ── Student ───────────────────────────────────────────────────────────────────
router.get("/:quizId/take", protect, requireVerified, validate(quizIdParamSchema), getQuizForStudent);
router.post("/:quizId/submit", protect, requireVerified, validate(submitQuizSchema), submitQuiz);
router.get("/:quizId/my-attempts", protect, validate(quizIdParamSchema), getMyAttempts);

// ── Instructor: view & grade attempts ────────────────────────────────────────
router.get("/:quizId/attempts", protect, authorize("INSTRUCTOR"), validate(quizIdParamSchema), getQuizAttempts);
router.patch("/attempts/:attemptId/grade", protect, authorize("INSTRUCTOR"), gradeQuizAttempt);

export default router;
