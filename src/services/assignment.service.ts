import { prisma } from "../lib/prisma.js";
import { ServiceError } from "../errors/service.error.js";

// ── Instructor: Create assignment ─────────────────────────────────────────────
export const createAssignmentService = async (
  courseId: string,
  instructorId: string,
  data: { title: string; description?: string; dueDate?: Date | null },
) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });
  if (!course) throw new ServiceError("Course not found.", 404);
  if (course.instructorId !== instructorId)
    throw new ServiceError("Forbidden.", 403);

  return await prisma.assignment.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      dueDate: data.dueDate ?? null,
      courseId,
    },
  });
};

// ── Instructor: Update assignment ─────────────────────────────────────────────
export const updateAssignmentService = async (
  assignmentId: string,
  instructorId: string,
  data: { title?: string; description?: string; dueDate?: Date | null },
) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { instructorId: true } } },
  });
  if (!assignment) throw new ServiceError("Assignment not found.", 404);
  if (assignment.course.instructorId !== instructorId)
    throw new ServiceError("Forbidden.", 403);

  return await prisma.assignment.update({ where: { id: assignmentId }, data });
};

// ── Instructor: Delete assignment ─────────────────────────────────────────────
export const deleteAssignmentService = async (
  assignmentId: string,
  instructorId: string,
) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { instructorId: true } } },
  });
  if (!assignment) throw new ServiceError("Assignment not found.", 404);
  if (assignment.course.instructorId !== instructorId)
    throw new ServiceError("Forbidden.", 403);

  return await prisma.assignment.delete({ where: { id: assignmentId } });
};

// ── Shared: Get all assignments for a course ──────────────────────────────────
export const getCourseAssignmentsService = async (courseId: string) => {
  return await prisma.assignment.findMany({
    where: { courseId },
    orderBy: { dueDate: "asc" },
    include: { _count: { select: { submissions: true } } },
  });
};

// ── Student: Submit assignment (text or file) ─────────────────────────────────
export const submitAssignmentService = async (
  assignmentId: string,
  userId: string,
  data: { textContent?: string; fileUrl?: string; fileName?: string },
) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { dueDate: true, courseId: true },
  });
  if (!assignment) throw new ServiceError("Assignment not found.", 404);

  // Check due date
  if (assignment.dueDate && new Date() > assignment.dueDate) {
    throw new ServiceError("The submission deadline has passed.", 400);
  }

  // Check enrollment
  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: assignment.courseId } },
  });
  if (!enrolled)
    throw new ServiceError("You are not enrolled in this course.", 403);

  if (!data.textContent?.trim() && !data.fileUrl) {
    throw new ServiceError(
      "Submission must include text content or a file.",
      400,
    );
  }

  // Upsert — allow resubmission
  return await prisma.submission.upsert({
    where: { userId_assignmentId: { userId, assignmentId } },
    update: {
      textContent: data.textContent ?? null,
      fileUrl: data.fileUrl ?? null,
      fileName: data.fileName ?? null,
      submittedAt: new Date(),
    },
    create: {
      userId,
      assignmentId,
      textContent: data.textContent ?? null,
      fileUrl: data.fileUrl ?? null,
      fileName: data.fileName ?? null,
    },
  });
};

// ── Instructor: View all submissions for an assignment ────────────────────────
export const getSubmissionsService = async (
  assignmentId: string,
  instructorId: string,
) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { instructorId: true } } },
  });
  if (!assignment) throw new ServiceError("Assignment not found.", 404);
  if (assignment.course.instructorId !== instructorId)
    throw new ServiceError("Forbidden.", 403);

  return await prisma.submission.findMany({
    where: { assignmentId },
    orderBy: { submittedAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profile: { select: { avatar: true } },
        },
      },
    },
  });
};

// ── Student: Get own submission ───────────────────────────────────────────────
export const getMySubmissionService = async (
  assignmentId: string,
  userId: string,
) => {
  return await prisma.submission.findUnique({
    where: { userId_assignmentId: { userId, assignmentId } },
  });
};
