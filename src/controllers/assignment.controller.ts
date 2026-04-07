import type { Request, Response, NextFunction } from "express";
import {
  createAssignmentService,
  updateAssignmentService,
  deleteAssignmentService,
  getCourseAssignmentsService,
  submitAssignmentService,
  getSubmissionsService,
  getMySubmissionService,
} from "../services/assignment.service.js";

interface ProtectedRequest extends Request {
  user: { userId: string; role: string };
}

export const createAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params as { courseId: string };
    const instructorId = (req as ProtectedRequest).user.userId;
    const assignment = await createAssignmentService(courseId, instructorId, req.body);
    res.status(201).json({ success: true, data: assignment });
  } catch (err) { next(err); }
};

export const updateAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const instructorId = (req as ProtectedRequest).user.userId;
    const assignment = await updateAssignmentService(assignmentId, instructorId, req.body);
    res.status(200).json({ success: true, data: assignment });
  } catch (err) { next(err); }
};

export const deleteAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const instructorId = (req as ProtectedRequest).user.userId;
    await deleteAssignmentService(assignmentId, instructorId);
    res.status(200).json({ success: true, message: "Assignment deleted." });
  } catch (err) { next(err); }
};

export const getCourseAssignments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { courseId } = req.params as { courseId: string };
    const assignments = await getCourseAssignmentsService(courseId);
    res.status(200).json({ success: true, data: assignments });
  } catch (err) { next(err); }
};

export const submitAssignment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const userId = (req as ProtectedRequest).user.userId;
    const fileUrl = req.file ? (req.file as any).path : undefined;
    const fileName = req.file?.originalname;
    const submission = await submitAssignmentService(assignmentId, userId, {
      textContent: req.body.textContent,
      fileUrl,
      fileName,
    });
    res.status(201).json({ success: true, data: submission });
  } catch (err) { next(err); }
};

export const getSubmissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const instructorId = (req as ProtectedRequest).user.userId;
    const submissions = await getSubmissionsService(assignmentId, instructorId);
    res.status(200).json({ success: true, data: submissions });
  } catch (err) { next(err); }
};

export const getMySubmission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assignmentId } = req.params as { assignmentId: string };
    const userId = (req as ProtectedRequest).user.userId;
    const submission = await getMySubmissionService(assignmentId, userId);
    if (!submission) return res.status(404).json({ success: false, message: "No submission found." });
    res.status(200).json({ success: true, data: submission });
  } catch (err) { next(err); }
};
