import type { Request, Response, NextFunction } from "express";
import { updateLessonProgressService, getCourseProgressService } from "../services/progress.service.js";

interface ProtectedRequest extends Request {
  user: { userId: string; role: string };
}

// Called by video player — updates watch progress and unlocks next lesson
export const updateLessonProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lessonId } = req.params as { lessonId: string };
    const userId = (req as ProtectedRequest).user.userId;
    const { watchedPercent } = req.body;
    const progress = await updateLessonProgressService(userId, lessonId, Number(watchedPercent));
    res.status(200).json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};

// Returns full course progress for the logged-in student
export const getCourseProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params as { courseId: string };
    const userId = (req as ProtectedRequest).user.userId;
    const progress = await getCourseProgressService(userId, courseId);
    res.status(200).json({ success: true, data: progress });
  } catch (err) {
    next(err);
  }
};
