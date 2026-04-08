import { prisma } from "../lib/prisma.js";
import { ServiceError } from "../errors/service.error.js";
import { deleteFromCloudinary } from "../utils/cloudinary.util.js";

type AssignmentFile = { name: string; url: string; type: string };

// ── Instructor: Create assignment ─────────────────────────────────────────────
export const createAssignmentService = async (
  courseId: string,
  instructorId: string,
  data: { title: string; description?: string; type?: string; files?: AssignmentFile[]; questions?: any[] },
) => {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
  if (!course) throw new ServiceError("Course not found.", 404);
  if (course.instructorId !== instructorId) throw new ServiceError("Forbidden.", 403);

  return await prisma.assignment.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      type: (data.type as any) ?? "FILE_SUBMISSION",
      files: data.files ?? [],
      questions: data.questions ?? [],
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
  if (assignment.course.instructorId !== instructorId) throw new ServiceError("Forbidden.", 403);

  return await prisma.assignment.update({ where: { id: assignmentId }, data });
};

// ── Instructor: Delete assignment ─────────────────────────────────────────────
export const deleteAssignmentService = async (assignmentId: string, instructorId: string) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { instructorId: true } }, submissions: { select: { fileUrl: true } } },
  });
  if (!assignment) throw new ServiceError("Assignment not found.", 404);
  if (assignment.course.instructorId !== instructorId) throw new ServiceError("Forbidden.", 403);

  // Clean up all submission files from Cloudinary
  const submissionUrls = assignment.submissions.map((s) => s.fileUrl).filter(Boolean) as string[];
  await Promise.all(submissionUrls.map((url) => deleteFromCloudinary(url, "raw")));

  // Clean up assignment attachment files
  const files = (assignment.files as { url: string; type: string }[]) ?? [];
  await Promise.all(
    files.map((f) =>
      deleteFromCloudinary(f.url, f.type === "VIDEO" ? "video" : f.type === "IMAGE" ? "image" : "raw")
    )
  );

  return await prisma.assignment.delete({ where: { id: assignmentId } });
};

// ── Shared: Get all assignments for a course ──────────────────────────────────
export const getCourseAssignmentsService = async (courseId: string) => {
  return await prisma.assignment.findMany({
    where: { courseId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { submissions: true } } },
  });
};

// ── Student: Submit assignment (text, file, or MCQ) ───────────────────────────
export const submitAssignmentService = async (
  assignmentId: string,
  userId: string,
  data: { textContent?: string; fileUrl?: string; fileName?: string; mcqAnswers?: { questionIndex: number; selectedIndex: number }[] },
) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { courseId: true, type: true, questions: true, files: true },
  });
  if (!assignment) throw new ServiceError("Assignment not found.", 404);

  const enrolled = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId: assignment.courseId } },
  });
  if (!enrolled) throw new ServiceError("You are not enrolled in this course.", 403);

  // MCQ type — auto-calculate score
  if (assignment.type === "MCQ") {
    if (!data.mcqAnswers?.length) {
      throw new ServiceError("MCQ submission requires answers.", 400);
    }
    const questions = assignment.questions as { question: string; options: string[]; correctIndex: number }[];
    const correct = data.mcqAnswers.filter(
      (a) => questions[a.questionIndex]?.correctIndex === a.selectedIndex
    ).length;
    const mcqScore = Math.round((correct / questions.length) * 100);

    return await prisma.submission.upsert({
      where: { userId_assignmentId: { userId, assignmentId } },
      update: { mcqAnswers: data.mcqAnswers, mcqScore, submittedAt: new Date() },
      create: { userId, assignmentId, mcqAnswers: data.mcqAnswers, mcqScore },
    });
  }

  // FILE_SUBMISSION type
  if (!data.textContent?.trim() && !data.fileUrl) {
    throw new ServiceError("Submission must include text content or a file.", 400);
  }

  // Delete old file from Cloudinary on resubmission
  if (data.fileUrl) {
    const existing = await prisma.submission.findUnique({
      where: { userId_assignmentId: { userId, assignmentId } },
      select: { fileUrl: true },
    });
    if (existing?.fileUrl) {
      await deleteFromCloudinary(existing.fileUrl, "raw");
    }
  }

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
export const getSubmissionsService = async (assignmentId: string, instructorId: string) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: { select: { instructorId: true } } },
  });
  if (!assignment) throw new ServiceError("Assignment not found.", 404);
  if (assignment.course.instructorId !== instructorId) throw new ServiceError("Forbidden.", 403);

  return await prisma.submission.findMany({
    where: { assignmentId },
    orderBy: { submittedAt: "desc" },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, profile: { select: { avatar: true } } },
      },
    },
  });
};

// ── Student: Get own submission ───────────────────────────────────────────────
export const getMySubmissionService = async (assignmentId: string, userId: string) => {
  return await prisma.submission.findUnique({
    where: { userId_assignmentId: { userId, assignmentId } },
  });
};

// ── Instructor: Grade a submission ────────────────────────────────────────────
export const gradeSubmissionService = async (
  submissionId: string,
  instructorId: string,
  data: { grade: number; maxGrade?: number; feedback?: string },
) => {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: { include: { course: { select: { instructorId: true } } } },
    },
  });

  if (!submission) throw new ServiceError("Submission not found.", 404);
  if (submission.assignment.course.instructorId !== instructorId) {
    throw new ServiceError("Forbidden.", 403);
  }

  const maxGrade = data.maxGrade ?? 100;
  if (data.grade > maxGrade) {
    throw new ServiceError(`Grade cannot exceed max grade of ${maxGrade}.`, 400);
  }

  return await prisma.submission.update({
    where: { id: submissionId },
    data: {
      grade: data.grade,
      maxGrade,
      feedback: data.feedback ?? null,
      gradedAt: new Date(),
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  });
};
