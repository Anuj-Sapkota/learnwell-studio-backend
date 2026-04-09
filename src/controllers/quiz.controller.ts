import type { Request, Response, NextFunction } from "express";
import {
  addQuestionService, getQuestionBankService, updateQuestionService, deleteQuestionService,
  createQuizService, updateQuizService, deleteQuizService, getCourseQuizzesService,
  getQuizForStudentService, submitQuizService, getQuizAttemptsService,
  gradeQuizAttemptService, getMyAttemptsService,
} from "../services/quiz.service.js";

interface PR extends Request { user: { userId: string; role: string }; }
const uid = (req: Request) => (req as PR).user.userId;

// ── Question Bank ─────────────────────────────────────────────────────────────

export const addQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = await addQuestionService(req.params.courseId as string, uid(req), req.body);
    res.status(201).json({ success: true, data: q });
  } catch (e) { next(e); }
};

export const getQuestionBank = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const questions = await getQuestionBankService(req.params.courseId as string, uid(req));
    res.status(200).json({ success: true, data: questions });
  } catch (e) { next(e); }
};

export const updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = await updateQuestionService(req.params.questionId as string, uid(req), req.body);
    res.status(200).json({ success: true, data: q });
  } catch (e) { next(e); }
};

export const deleteQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteQuestionService(req.params.questionId as string, uid(req));
    res.status(200).json({ success: true, message: "Question deleted." });
  } catch (e) { next(e); }
};

// ── Quiz CRUD ─────────────────────────────────────────────────────────────────

export const createQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await createQuizService(req.params.courseId as string, uid(req), req.body);
    res.status(201).json({ success: true, data: quiz });
  } catch (e) { next(e); }
};

export const updateQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await updateQuizService(req.params.quizId as string, uid(req), req.body);
    res.status(200).json({ success: true, data: quiz });
  } catch (e) { next(e); }
};

export const deleteQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await deleteQuizService(req.params.quizId as string, uid(req));
    res.status(200).json({ success: true, message: "Quiz deleted." });
  } catch (e) { next(e); }
};

export const getCourseQuizzes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quizzes = await getCourseQuizzesService(req.params.courseId as string);
    res.status(200).json({ success: true, data: quizzes });
  } catch (e) { next(e); }
};

// ── Student ───────────────────────────────────────────────────────────────────

export const getQuizForStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await getQuizForStudentService(req.params.quizId as string, uid(req));
    res.status(200).json({ success: true, data: quiz });
  } catch (e) { next(e); }
};

export const submitQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await submitQuizService(
      req.params.quizId as string,
      uid(req),
      req.body.answers,
      req.body.timeTaken,
    );
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const getMyAttempts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attempts = await getMyAttemptsService(req.params.quizId as string, uid(req));
    res.status(200).json({ success: true, data: attempts });
  } catch (e) { next(e); }
};

// ── Instructor ────────────────────────────────────────────────────────────────

export const getQuizAttempts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attempts = await getQuizAttemptsService(req.params.quizId as string, uid(req));
    res.status(200).json({ success: true, data: attempts });
  } catch (e) { next(e); }
};

export const gradeQuizAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await gradeQuizAttemptService(req.params.attemptId as string, uid(req), req.body);
    res.status(200).json({ success: true, data: result });
  } catch (e) { next(e); }
};
