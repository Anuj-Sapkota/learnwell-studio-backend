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

// Add Section
export const addSection = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title } = req.body;
    const section = await courseService.createSectionService(courseId, title);
    res.status(201).json({ success: true, data: section });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add Lesson
export const addLesson = async (req: Request, res: Response) => {
  try {
    const { sectionId } = req.params;
    const lesson = await courseService.createLessonService({
      ...req.body,
      sectionId,
    });
    res.status(201).json({ success: true, data: lesson });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCourseDetail = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const course = await courseService.getCourseDetailService(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMyCreatedCourses = async (req: Request, res: Response) => {
  try {
    // req.user comes from your 'protect' middleware
    const instructorId = (req as any).user.userId;

    const courses =
      await courseService.getInstructorCoursesService(instructorId);

    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
