import type { Request, Response, NextFunction } from "express";
import {
  createAssignmentService,
  updateAssignmentService,
  deleteAssignmentService,
  getCourseAssignmentsService,
  submitAssignmentService,
  getSubmissionsService,
  getMySubmissionService,
  gradeSubmissionService,
} from "../services/assignment.service.js";

interface ProtectedRequest extends Request {
  user: { userId: string; role: string };
}

// ── Instructor: Create assignment with optional file attachments ──────────────
export const createAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params as { courseId: string };
    const instructorId = (req as ProtectedRequest).user.userId;

    // Guard against undefined — no files uploaded is valid
    const uploadedFiles = (req.files as Express.Multer.File[]) ?? [];
    const { links } = req.body;

    // Map uploaded Cloudinary files into a storable format
    const fileData = uploadedFiles.map((file) => ({
      name: file.originalname,
      url: (file as any).path,
      type: file.mimetype.startsWith("video/")
        ? "VIDEO"
        : file.mimetype.startsWith("image/")
          ? "IMAGE"
          : "DOCUMENT",
    }));

    // Map any external links sent as string or array
    const rawLinks: string[] = Array.isArray(links) ? links : links ? [links] : [];
    const linkData = rawLinks.map((url) => ({ name: "External Link", url, type: "LINK" }));

    const assignment = await createAssignmentService(courseId, instructorId, {
      ...req.body,
      files: [...fileData, ...linkData],
    });

    res.status(201).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
};

// ── Instructor: Update assignment ─────────────────────────────────────────────
export const updateAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const instructorId = (req as ProtectedRequest).user.userId;
    const assignment = await updateAssignmentService(assignmentId, instructorId, req.body);
    res.status(200).json({ success: true, data: assignment });
  } catch (err) {
    next(err);
  }
};

// ── Instructor: Delete assignment ─────────────────────────────────────────────
export const deleteAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const instructorId = (req as ProtectedRequest).user.userId;
    await deleteAssignmentService(assignmentId, instructorId);
    res.status(200).json({ success: true, message: "Assignment deleted." });
  } catch (err) {
    next(err);
  }
};

// ── Shared: Get all assignments for a course ──────────────────────────────────
export const getCourseAssignments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params as { courseId: string };
    const assignments = await getCourseAssignmentsService(courseId);
    res.status(200).json({ success: true, data: assignments });
  } catch (err) {
    next(err);
  }
};

// ── Student: Submit assignment ────────────────────────────────────────────────
export const submitAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const userId = (req as ProtectedRequest).user.userId;

    // Use dedicated submission storage — file is optional
    const fileUrl = req.file ? (req.file as any).path : undefined;
    const fileName = req.file?.originalname ?? null;

    const submission = await submitAssignmentService(assignmentId, userId, {
      textContent: req.body.textContent,
      fileUrl,
      ...(fileName && { fileName }),
    });

    res.status(201).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

// ── Instructor: View all submissions ─────────────────────────────────────────
export const getSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const instructorId = (req as ProtectedRequest).user.userId;
    const submissions = await getSubmissionsService(assignmentId, instructorId);
    res.status(200).json({ success: true, data: submissions });
  } catch (err) {
    next(err);
  }
};

// ── Student: Get own submission ───────────────────────────────────────────────
export const getMySubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const userId = (req as ProtectedRequest).user.userId;
    const submission = await getMySubmissionService(assignmentId, userId);
    if (!submission) return res.status(404).json({ success: false, message: "No submission found." });
    res.status(200).json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
};

// ── Instructor: Grade a submission ────────────────────────────────────────────
export const gradeSubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { submissionId } = req.params as { submissionId: string };
    const instructorId = (req as ProtectedRequest).user.userId;
    const result = await gradeSubmissionService(submissionId, instructorId, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
