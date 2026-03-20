import type { Request, Response } from "express";
import * as courseService from "../services/course.service.js";

interface ProtectedRequest extends Request {
  user: {
    userId: string;
    role: string;
  };
}

export const createCourse = async (req: Request, res: Response) => {
  try {
    
    const { userId: instructorId } = (req as ProtectedRequest).user;

    const course = await courseService.createCourseService({
      ...req.body,
      instructorId,
    });

    res.status(201).json({ success: true, data: course });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCourses = async (req: Request, res: Response) => {
  try {
    const courses = await courseService.getAllCoursesService();
    res.status(200).json({ success: true, data: courses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
