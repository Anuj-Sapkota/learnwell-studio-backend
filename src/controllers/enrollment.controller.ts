import type { Request, Response, NextFunction } from "express";
import {
  checkEnrollment,
  enrollInCourseService,
  getCourseFullContentService,
  getLessonDocumentService,
} from "../services/enrollment.service.js";

export const enrollInCourse = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.userId;

    const enrollment = await enrollInCourseService(userId, courseId);

    res.status(201).json({
      success: true,
      message: "Successfully enrolled in the course!",
      data: enrollment,
    });
  } catch (error) {
    next(error);
  }
};

export const getCoursePlayer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const course = await getCourseFullContentService(courseId);

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    const isOwner = userRole === "INSTRUCTOR" && course.instructorId === userId;
    const isAdmin = userRole === "ADMIN";
    const isEnrolled = await checkEnrollment(userId, courseId);

    if (!isOwner && !isAdmin && !isEnrolled) {
      return res.status(403).json({
        success: false,
        message: "Access Denied. You are not enrolled in this course.",
      });
    }

    res.status(200).json({ success: true, data: course });
  } catch (error) {
    next(error);
  }
};

/**
 * Proxies a lesson's PDF/document from Cloudinary through the backend.
 * Cloudinary blocks direct delivery of raw files on free/unverified accounts.
 * Token accepted via Authorization header OR ?token= query param (needed for iframe src).
 *
 * @route GET /api/course/lessons/:lessonId/document-proxy
 * @access Private — protect middleware handles auth (supports header + query param)
 */
export const proxyLessonDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const { pdfUrl, title, courseId } = await getLessonDocumentService(lessonId);

    const isOwner = userRole === "INSTRUCTOR";
    const isAdmin = userRole === "ADMIN";
    const isEnrolled = await checkEnrollment(userId, courseId);

    if (!isOwner && !isAdmin && !isEnrolled) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Cloudinary permissions are configured to allow raw/pdf delivery
    // Fetch the file directly using the stored URL
    const cloudinaryRes = await fetch(pdfUrl);

    if (!cloudinaryRes.ok) {
      const errorText = await cloudinaryRes.text();
      console.error("Cloudinary fetch failed:", cloudinaryRes.status, errorText);
      return res.status(502).json({ success: false, message: `Storage error: ${cloudinaryRes.status}` });
    }

    const contentType = cloudinaryRes.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${title}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");

    const { Readable } = await import("stream");
    Readable.fromWeb(cloudinaryRes.body as any).pipe(res);
  } catch (error) {
    next(error);
  }
};