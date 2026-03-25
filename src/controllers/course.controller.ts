import type { NextFunction, Request, Response } from "express";
import * as courseService from "../services/course.service.js";
import type { CreateCourseInput } from "../schemas/course.schema.js";

interface ProtectedRequest extends Request {
  user: {
    userId: string;
    role: string;
  };
}

export const createCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const instructorId = (req as ProtectedRequest).user.userId;

    console.log("This is instructor id:", instructorId);

    const validatedData = req.body as CreateCourseInput;

    const course = await courseService.createCourseService({
      ...validatedData,
      instructorId,
    });

    res.status(201).json({ success: true, data: course });
  } catch (error: any) {
    // res.status(500).json({ success: false, message: error.message });
    next(error);
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
    const { title, content } = req.body; // validation apply later------

    const videoUrl = req.file ? (req.file as any).path : null;

    if (!videoUrl && !content) {
      return res.status(400).json({
        success: false,
        message: "A lesson must have either a video or text content.",
      });
    }

    const lesson = await courseService.createLessonService({
      title,
      content,
      videoUrl,
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

export const getCoursePreview = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    // 1. Call the service
    const course = await courseService.getCoursePreviewService(courseId);

    // 2. Handle 404 if course ID is wrong
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // 3. Return the "Marketing Data" only
    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (err: any) {
    console.error("Get Course Preview Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

// get the logged in instructor code
export const getMyCourses = async (req: Request, res: Response) => {
  try {
    // Get the ID
    const instructorId = (req as any).user.userId;

    const courses =
      await courseService.getInstructorCoursesService(instructorId);

    // Return the data
    return res.status(200).json({
      success: true,
      message: "Instructor courses fetched successfully",
      data: courses,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch your courses",
    });
  }
};
