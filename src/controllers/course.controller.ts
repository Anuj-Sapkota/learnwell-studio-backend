import type { NextFunction, Request, Response } from "express";
import { getStudentEnrollments } from "../services/enrollment.service.js";
import type { CreateCourseInput } from "../schemas/course.schema.js";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "../lib/prisma.js";
import {
  createCourseService,
  createLessonService,
  createSectionService,
  getAllCoursesService,
  getCourseDetailService,
  getCoursePreviewService,
  getInstructorCoursesService,
  getSectionById,
  updateCourseService,
  updateCourseTotalDuration,
  deleteCourseService,
  deleteSectionService,
  updateSectionService,
  updateLessonService,
  deleteLessonService,
  syncLessonDurationsService,
  getEnrolledStudentsService,
} from "../services/course.service.js";

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
    const validatedData = req.body as CreateCourseInput;
    console.log("Validated data: ");
    console.log("Request body: ", req.body);
    const course = await createCourseService({
      ...validatedData,
      price: Number(validatedData.price),
      discount: Number(validatedData.discount ?? 0),
      isFree:
        validatedData.isFree === true ||
        (validatedData.isFree as any) === "true",
      accessDuration: validatedData.accessDuration
        ? Number(validatedData.accessDuration)
        : null,
      thumbnail: req.file ? (req.file as any).path : undefined,
      instructorId,
    });

    res.status(201).json({ success: true, data: course });
  } catch (error: any) {
    next(error);
  }
};

export const getCourses = async (req: Request, res: Response) => {
  try {
    const { search, categoryId } = req.query;
    const courses = await getAllCoursesService(
      search as string | undefined,
      categoryId as string | undefined,
    );
    res.status(200).json({ success: true, data: courses });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add Section
export const addSection = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { courseId } = req.params;
    const { title } = req.body;
    const section = await createSectionService(courseId, title);
    res.status(201).json({ success: true, data: section });
  } catch (error: any) {
    next(error);
  }
};

export const addLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sectionId } = req.params as { sectionId: string };
    const { title, content, contentType } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const videoFile = files?.video?.[0];
    const pdfFile = files?.document?.[0];

    if (!videoFile && !pdfFile && !content?.trim()) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "A lesson must have at least a video, a PDF, or text content.",
      });
    }

    let videoUrl: string | undefined;
    let videoName: string | undefined;
    let pdfUrl: string | undefined;
    let documentName: string | undefined;
    let duration = 0;

    if (videoFile) {
      videoUrl = (videoFile as any).path;
      videoName = videoFile.originalname;
      const publicId = (videoFile as any).public_id ?? (videoFile as any).filename?.replace(/\.[^/.]+$/, "");
      try {
        const result = await cloudinary.api.resource(publicId, { resource_type: "video" });
        duration = Math.round(result.duration || 0);
        console.log("Duration: ", duration);
        console.log("Result: ", result)
        console.log("Result duration: ", result.duration)
      } catch (err) {
        console.error("Cloudinary duration fetch failed:", err);
      }
    }

    if (pdfFile) {
      pdfUrl = (pdfFile as any).path;
      documentName = pdfFile.originalname;
    }

    // Auto-derive contentType if not sent
    let resolvedType = contentType ?? "TEXT";
    if (!contentType) {
      if (videoUrl && (pdfUrl || content)) resolvedType = "MIXED";
      else if (videoUrl) resolvedType = "VIDEO";
      else if (pdfUrl) resolvedType = "PDF";
      else resolvedType = "TEXT";
    }

    const lesson = await createLessonService({
      title, content, contentType: resolvedType,
      videoUrl, videoName, pdfUrl, documentName, duration, sectionId,
    });

    const section = await getSectionById(sectionId);
    if (section?.courseId) {
      await updateCourseTotalDuration(section.courseId);
      // Increment videoCount if this lesson has a video
      if (videoUrl) {
        await prisma.course.update({
          where: { id: section.courseId },
          data: { videoCount: { increment: 1 } },
        });
      }
    }

    res.status(201).json({ success: true, data: lesson });
  } catch (error: any) {
    next(error);
  }
};

export const getCourseDetail = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
    next(error);
  }
};

export const getCoursePreview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
    next(error);
  }
};

// get the logged in instructor code
export const getMyCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Get the ID
    const instructorId = (req as any).user.userId;

    const courses = await getInstructorCoursesService(instructorId);

    // Return the data
    return res.status(200).json({
      success: true,
      message: "Instructor courses fetched successfully",
      data: courses,
    });
  } catch (error: any) {
    next(error);
  }
};

export const getMyEnrolledCourses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req as any).user.userId;
    const enrollments = await getStudentEnrollments(userId);

    // Flatten the response so the frontend gets an array of courses directly
    const courses = enrollments.map((e) => e.course);

    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    next(error);
  }
};

export const updateCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { courseId } = req.params;
    const updateBody = { ...req.body };

    // 1. Handle File Upload (Cloudinary URL provided by Multer)
    if (req.file) {
      // 'path' is the Cloudinary URL when using multer-storage-cloudinary
      updateBody.thumbnail = req.file.path;
    }

    // 2. Delegate to Service
    const updatedCourse = await updateCourseService(courseId, updateBody);

    // 3. Return Response
    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: updatedCourse,
    });
  } catch (error) {
    // Passes Prisma errors (like P2025: Record not found) to error middleware
    next(error);
  }
};

export const deleteCourse = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { courseId } = req.params;
    const instructorId = (req as ProtectedRequest).user.userId;

    await deleteCourseService(courseId, instructorId);

    res
      .status(200)
      .json({ success: true, message: "Course deleted successfully" });
  } catch (error: any) {
    if (error.message === "Forbidden") {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this course",
      });
    }
    next(error);
  }
};

// Update Section (title / order)
export const updateSection = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sectionId } = req.params;
    const instructorId = (req as ProtectedRequest).user.userId;
    const section = await updateSectionService(
      sectionId,
      instructorId,
      req.body,
    );
    res.status(200).json({ success: true, data: section });
  } catch (error: any) {
    if (error.message === "Forbidden")
      return res.status(403).json({ success: false, message: "Forbidden" });
    next(error);
  }
};

// Delete Section
export const deleteSection = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { sectionId } = req.params;
    const instructorId = (req as ProtectedRequest).user.userId;
    await deleteSectionService(sectionId, instructorId);
    res
      .status(200)
      .json({ success: true, message: "Section deleted successfully" });
  } catch (error: any) {
    if (error.message === "Forbidden")
      return res.status(403).json({ success: false, message: "Forbidden" });
    next(error);
  }
};

// Update Lesson (title, content, order, or replace video/pdf)
export const updateLesson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { lessonId } = req.params;
    const instructorId = (req as ProtectedRequest).user.userId;
    const updateData: any = { ...req.body };

    // Handle file replacement
    if (req.file) {
      const isVideo = req.file.mimetype.startsWith("video");
      if (isVideo) {
        updateData.videoUrl = (req.file as any).path;
        // Fetch duration from Cloudinary
        const result = await cloudinary.api.resource(req.file.filename, {
          resource_type: "video",
        });
        updateData.duration = Math.round(result.duration || 0);
      } else {
        updateData.pdfUrl = (req.file as any).path;
      }
    }

    const lesson = await updateLessonService(
      lessonId,
      instructorId,
      updateData,
    );
    res.status(200).json({ success: true, data: lesson });
  } catch (error: any) {
    if (error.message === "Forbidden")
      return res.status(403).json({ success: false, message: "Forbidden" });
    next(error);
  }
};

// Delete Lesson
export const deleteLesson = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { lessonId } = req.params;
    const instructorId = (req as ProtectedRequest).user.userId;
    await deleteLessonService(lessonId, instructorId);
    res
      .status(200)
      .json({ success: true, message: "Lesson deleted successfully" });
  } catch (error: any) {
    if (error.message === "Forbidden")
      return res.status(403).json({ success: false, message: "Forbidden" });
    next(error);
  }
};

// Upload PDF/document to an existing lesson
export const uploadLessonDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { lessonId } = req.params;
    const instructorId = (req as ProtectedRequest).user.userId;

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No document file provided" });
    }

    const pdfUrl = (req.file as any).path;
    const documentName = req.file.originalname;
    const lesson = await updateLessonService(lessonId, instructorId, {
      pdfUrl,
      documentName,
    });
    res.status(200).json({ success: true, data: lesson });
  } catch (error: any) {
    if (error.message === "Forbidden")
      return res.status(403).json({ success: false, message: "Forbidden" });
    next(error);
  }
};

// Sync durations for existing lessons that have duration = 0
export const syncLessonDurations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { courseId } = req.params;
    const instructorId = (req as ProtectedRequest).user.userId;
    const result = await syncLessonDurationsService(courseId, instructorId);
    res
      .status(200)
      .json({ success: true, message: `Synced ${result.updated} lesson(s)` });
  } catch (error: any) {
    if (error.message === "Forbidden")
      return res.status(403).json({ success: false, message: "Forbidden" });
    next(error);
  }
};

// Get enrolled students for a specific course
export const getEnrolledStudents = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { courseId } = req.params as { courseId: string };
    const instructorId = (req as ProtectedRequest).user.userId;
    const data = await getEnrolledStudentsService(courseId, instructorId);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    if (error.message === "Forbidden")
      return res
        .status(403)
        .json({ success: false, message: "You do not own this course." });
    if (error.message === "Course not found")
      return res
        .status(404)
        .json({ success: false, message: "Course not found." });
    next(error);
  }
};

// Upload or replace instructor signature for a course
export const uploadSignature = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params as { courseId: string };
    const instructorId = (req as ProtectedRequest).user.userId;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No signature file provided." });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true, instructorSignature: true } });
    if (!course) return res.status(404).json({ success: false, message: "Course not found." });
    if (course.instructorId !== instructorId) return res.status(403).json({ success: false, message: "Forbidden." });

    // Delete old signature from Cloudinary if exists
    if (course.instructorSignature) {
      const { deleteFromCloudinary } = await import("../utils/cloudinary.util.js");
      await deleteFromCloudinary(course.instructorSignature, "image");
    }

    const signatureUrl = (req.file as any).path;
    const updated = await prisma.course.update({
      where: { id: courseId },
      data: { instructorSignature: signatureUrl },
      select: { id: true, instructorSignature: true },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};
