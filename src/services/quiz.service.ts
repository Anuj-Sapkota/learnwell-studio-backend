import { prisma } from "../lib/prisma.js";
import { ServiceError } from "../errors/service.error.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const verifyInstructor = async (courseId: string, instructorId: string) => {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
  if (!course) throw new ServiceError("Course not found.", 404);
  if (course.instructorId !== instructorId) throw new ServiceError("Forbidden.", 403);
  return course;
};

const verifyEnrolled = async (userId: string, courseId: string) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (!enrollment) throw new ServiceError("You are not enrolled in this course.", 403);
};

// ── Question Bank ─────────────────────────────────────────────────────────────

export const getOrCreateQuestionBank = async (courseId: string) => {
  return await prisma.questionBank.upsert({
    where: { courseId },
    update: {},
    create: { courseId },
  });
};

export const addQuestionService = async (
  courseId: string,
  instructorId: string,
  data: { type: string; text: string; options?: string[]; correctAnswer?: string; explanation?: string; points?: number }
) => {
  await verifyInstructor(courseId, instructorId);
  const bank = await getOrCreateQuestionBank(courseId);

  return await prisma.question.create({
    data: {
      type: data.type as any,
      text: data.text,
      options: data.options ?? [],
      correctAnswer: data.correctAnswer ?? null,
      explanation: data.explanation ?? null,
      points: data.points ?? 1,
      questionBankId: bank.id,
    },
  });
};

export const getQuestionBankService = async (courseId: string, instructorId: string) => {
  await verifyInstructor(courseId, instructorId);
  return await prisma.question.findMany({
    where: { questionBank: { courseId } },
    orderBy: { createdAt: "desc" },
  });
};

export const updateQuestionService = async (
  questionId: string,
  instructorId: string,
  data: { text?: string; options?: string[]; correctAnswer?: string; explanation?: string; points?: number }
) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { questionBank: { select: { courseId: true } } },
  });
  if (!question) throw new ServiceError("Question not found.", 404);
  await verifyInstructor(question.questionBank.courseId, instructorId);

  return await prisma.question.update({
    where: { id: questionId },
    data: {
      ...(data.text && { text: data.text }),
      ...(data.options && { options: data.options }),
      ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer }),
      ...(data.explanation !== undefined && { explanation: data.explanation }),
      ...(data.points && { points: data.points }),
    },
  });
};

export const deleteQuestionService = async (questionId: string, instructorId: string) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { questionBank: { select: { courseId: true } } },
  });
  if (!question) throw new ServiceError("Question not found.", 404);
  await verifyInstructor(question.questionBank.courseId, instructorId);
  return await prisma.question.delete({ where: { id: questionId } });
};

// ── Quiz CRUD ─────────────────────────────────────────────────────────────────

export const createQuizService = async (
  courseId: string,
  instructorId: string,
  data: { title: string; description?: string; timeLimitSecs?: number; randomize?: boolean; passingScore?: number; maxAttempts?: number; questionIds: string[] }
) => {
  await verifyInstructor(courseId, instructorId);

  const quiz = await prisma.quiz.create({
    data: {
      title: data.title,
      description: data.description ?? null,
      timeLimitSecs: data.timeLimitSecs ?? null,
      randomize: data.randomize ?? false,
      passingScore: data.passingScore ?? 60,
      maxAttempts: data.maxAttempts ?? 0,
      courseId,
      questions: {
        create: data.questionIds.map((questionId, index) => ({ questionId, order: index })),
      },
    },
    include: { questions: { include: { question: true }, orderBy: { order: "asc" } } },
  });

  return quiz;
};

export const updateQuizService = async (
  quizId: string,
  instructorId: string,
  data: { title?: string; description?: string; timeLimitSecs?: number | null; randomize?: boolean; passingScore?: number; maxAttempts?: number; questionIds?: string[] }
) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { courseId: true } });
  if (!quiz) throw new ServiceError("Quiz not found.", 404);
  await verifyInstructor(quiz.courseId, instructorId);

  // If questionIds provided, replace all quiz questions
  if (data.questionIds) {
    await prisma.quizQuestion.deleteMany({ where: { quizId } });
    await prisma.quizQuestion.createMany({
      data: data.questionIds.map((questionId, index) => ({ quizId, questionId, order: index })),
    });
  }

  const { questionIds, ...rest } = data;
  return await prisma.quiz.update({
    where: { id: quizId },
    data: rest,
    include: { questions: { include: { question: true }, orderBy: { order: "asc" } } },
  });
};

export const deleteQuizService = async (quizId: string, instructorId: string) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { courseId: true } });
  if (!quiz) throw new ServiceError("Quiz not found.", 404);
  await verifyInstructor(quiz.courseId, instructorId);
  return await prisma.quiz.delete({ where: { id: quizId } });
};

export const getCourseQuizzesService = async (courseId: string) => {
  return await prisma.quiz.findMany({
    where: { courseId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { questions: true, attempts: true } } },
  });
};

export const getQuizForStudentService = async (quizId: string, userId: string) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            select: {
              id: true, type: true, text: true, options: true, points: true,
              // Never expose correctAnswer to students
            },
          },
        },
      },
    },
  });
  if (!quiz) throw new ServiceError("Quiz not found.", 404);
  await verifyEnrolled(userId, quiz.courseId);

  // Check attempt limit
  if (quiz.maxAttempts > 0) {
    const attemptCount = await prisma.quizAttempt.count({ where: { quizId, userId } });
    if (attemptCount >= quiz.maxAttempts) {
      throw new ServiceError(`You have reached the maximum of ${quiz.maxAttempts} attempt(s) for this quiz.`, 403);
    }
  }

  let questions = quiz.questions;
  if (quiz.randomize) {
    questions = [...questions].sort(() => Math.random() - 0.5);
  }

  return { ...quiz, questions };
};

// ── Quiz Submission & Auto-grading ────────────────────────────────────────────

export const submitQuizService = async (
  quizId: string,
  userId: string,
  answers: { questionId: string; answer: string }[],
  timeTaken?: number,
) => {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { question: { select: { id: true, type: true, correctAnswer: true, points: true } } },
      },
    },
  });
  if (!quiz) throw new ServiceError("Quiz not found.", 404);
  await verifyEnrolled(userId, quiz.courseId);

  // Check attempt limit
  if (quiz.maxAttempts > 0) {
    const attemptCount = await prisma.quizAttempt.count({ where: { quizId, userId } });
    if (attemptCount >= quiz.maxAttempts) {
      throw new ServiceError(`Maximum attempts reached.`, 403);
    }
  }

  // Auto-grade MCQ, TRUE_FALSE, FILL_BLANK — CODING is manual
  let earnedPoints = 0;
  let totalPoints = 0;

  const gradedAnswers = quiz.questions.map(({ question }) => {
    const submitted = answers.find((a) => a.questionId === question.id);
    const answer = submitted?.answer ?? "";
    totalPoints += question.points;

    let isCorrect: boolean | null = null;

    if (question.type === "MCQ" || question.type === "TRUE_FALSE") {
      isCorrect = answer === question.correctAnswer;
    } else if (question.type === "FILL_BLANK") {
      isCorrect = answer.trim().toLowerCase() === (question.correctAnswer ?? "").trim().toLowerCase();
    } else {
      // CODING — null means needs manual grading
      isCorrect = null;
    }

    if (isCorrect === true) earnedPoints += question.points;

    return { questionId: question.id, answer, isCorrect };
  });

  const hasCoding = quiz.questions.some((q) => q.question.type === "CODING");
  const score = hasCoding ? null : Math.round((earnedPoints / totalPoints) * 100);
  const passed = score !== null ? score >= quiz.passingScore : null;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      answers: gradedAnswers,
      score,
      maxScore: totalPoints,
      passed,
      timeTaken: timeTaken ?? null,
    },
  });

  return { attempt, score, passed, earnedPoints, totalPoints };
};

// ── Instructor: view all attempts ─────────────────────────────────────────────

export const getQuizAttemptsService = async (quizId: string, instructorId: string) => {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, select: { courseId: true } });
  if (!quiz) throw new ServiceError("Quiz not found.", 404);
  await verifyInstructor(quiz.courseId, instructorId);

  return await prisma.quizAttempt.findMany({
    where: { quizId },
    orderBy: { submittedAt: "desc" },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
};

// ── Instructor: manually grade a coding answer ────────────────────────────────

export const gradeQuizAttemptService = async (
  attemptId: string,
  instructorId: string,
  data: { score: number; feedback?: string }
) => {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: { select: { courseId: true, passingScore: true } } },
  });
  if (!attempt) throw new ServiceError("Attempt not found.", 404);
  await verifyInstructor(attempt.quiz.courseId, instructorId);

  const passed = data.score >= attempt.quiz.passingScore;
  return await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: { score: data.score, passed },
  });
};

// ── Student: get own attempts ─────────────────────────────────────────────────

export const getMyAttemptsService = async (quizId: string, userId: string) => {
  return await prisma.quizAttempt.findMany({
    where: { quizId, userId },
    orderBy: { submittedAt: "desc" },
  });
};
