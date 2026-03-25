import type {Request, Response, NextFunction } from "express";
import { checkEnrollment, enrollInCourseService, getCourseFullContentService } from "../services/enrollment.service.js";

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

export const getCoursePlayer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user.userId; // From your 'protect' middleware

    const isEnrolled = await checkEnrollment(userId, courseId);

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: "Access Denied. You are not enrolled in this course."
      });
    }

    // Fetch the full content
    const course = await getCourseFullContentService(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.status(200).json({
      success: true,
      data: course
    });
  } catch (error) {
    next(error);
  }
};