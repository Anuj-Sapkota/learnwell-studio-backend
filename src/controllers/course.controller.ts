import type { NextFunction, Request, Response } from "express";
import { getStudentEnrollments } from "../services/enrollment.service.js"
import type { CreateCourseInput } from "../schemas/course.schema.js";
import { v2 as cloudinary } from "cloudinary";
import { createCourseService, createLessonService, createSectionService, getAllCoursesService, getCourseDetailService, getCoursePreviewService, getInstructorCoursesService, getSectionById, updateCourseTotalDuration } from "../services/course.service.js";

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

    const course = await createCourseService({
      ...validatedData,
      price: Number(validatedData.price), // as formdata sends string
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
    const courses = await getAllCoursesService();
    res.status(200).json({ success: true, data: courses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add Section
export const addSection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const { title } = req.body;
    const section = await createSectionService(courseId, title);
    res.status(201).json({ success: true, data: section });
  } catch (error: any) {
   next(error)
  }
};

// Add Lesson
export const addLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sectionId } = req.params;
    const { title, content } = req.body; // validation apply later------

    const videoUrl = req.file ? (req.file as any).path : null;
    const publicId = req.file?.filename;

    //fetching the result for duration
    const result = await cloudinary.api.resource(publicId, {
      resource_type: "video",
      image_metadata: true,
    });

    const duration = Math.round(result.duration || 0);

    console.log("Duration of the uploaded file in lesson: ", result);

    if (!videoUrl && !content) {
      return res.status(400).json({
        success: false,
        message: "A lesson must have either a video or text content.",
      });
    }

    const lesson = await createLessonService({
      title,
      content,
      videoUrl,
      duration,
      sectionId,
    });

    //fetch section by id
    const section = await getSectionById(sectionId);

    if (section?.courseId) {
      await updateCourseTotalDuration(section.courseId);
    }

    res.status(201).json({ success: true, data: lesson });
  } catch (error: any) {
    next(error)
  }
};

export const getCourseDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;

    const course = await getCourseDetailService(courseId);

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
   next(error)
    };
  };

export const getCoursePreview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;

    // 1. Call the service
    const course = await getCoursePreviewService(courseId);

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
  } catch (error: any) {
    console.error("Get Course Preview Error:", error);
   next(error)
  }
};

// get the logged in instructor code
export const getMyCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the ID
    const instructorId = (req as any).user.userId;

    const courses =
      await getInstructorCoursesService(instructorId);

    // Return the data
    return res.status(200).json({
      success: true,
      message: "Instructor courses fetched successfully",
      data: courses,
    });
  } catch (error: any) {
   next(error)
  }
};


export const getMyEnrolledCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.userId;
    const enrollments = await getStudentEnrollments(userId);
    
    // Flatten the response so the frontend gets an array of courses directly
    const courses = enrollments.map(e => e.course);

    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};
