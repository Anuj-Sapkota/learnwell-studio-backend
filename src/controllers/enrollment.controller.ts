import type {Request, Response, NextFunction } from "express";
import { enrollInCourseService } from "../services/enrollment.service.js";

export const enrollInCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;

    
    const enrollment = await enrollInCourseService(userId, courseId);

    res.status(201).json({
      success: true,
      message: "Successfully enrolled in the course!",
      data: enrollment,
    });
  } catch (error: any) {
    next(error);
  }
};