import { z } from "zod";

// ── Question Bank ─────────────────────────────────────────────────────────────

export const addQuestionSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID"),
  }),
  body: z.object({
    type: z.enum(["MCQ", "TRUE_FALSE", "FILL_BLANK", "CODING"]),
    text: z.string().trim().min(3, "Question text is required"),
    options: z.preprocess(
      (v) => { if (Array.isArray(v)) return v; if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } } return []; },
      z.array(z.string().min(1)).default([])
    ),
    correctAnswer: z.string().optional(), // index for MCQ, "true"/"false", expected string for FILL_BLANK
    explanation: z.string().trim().optional(),
    points: z.coerce.number().int().positive().default(1),
  }),
});

export const questionIdParamSchema = z.object({
  params: z.object({ questionId: z.string().uuid("Invalid Question ID") }),
});

// ── Quiz ──────────────────────────────────────────────────────────────────────

export const createQuizSchema = z.object({
  params: z.object({ courseId: z.string().uuid("Invalid Course ID") }),
  body: z.object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().optional(),
    timeLimitSecs: z.coerce.number().int().positive().optional(),
    randomize: z.coerce.boolean().default(false),
    passingScore: z.coerce.number().int().min(0).max(100).default(60),
    maxAttempts: z.coerce.number().int().nonnegative().default(0),
    // Question IDs to include in this quiz (from the question bank)
    questionIds: z.preprocess(
      (v) => { if (Array.isArray(v)) return v; if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } } return []; },
      z.array(z.string().uuid()).min(1, "At least one question is required")
    ),
  }),
});

export const updateQuizSchema = z.object({
  params: z.object({ quizId: z.string().uuid("Invalid Quiz ID") }),
  body: z.object({
    title: z.string().trim().min(3).max(150).optional(),
    description: z.string().trim().optional(),
    timeLimitSecs: z.coerce.number().int().positive().nullable().optional(),
    randomize: z.coerce.boolean().optional(),
    passingScore: z.coerce.number().int().min(0).max(100).optional(),
    maxAttempts: z.coerce.number().int().nonnegative().optional(),
    questionIds: z.preprocess(
      (v) => { if (Array.isArray(v)) return v; if (typeof v === "string") { try { return JSON.parse(v); } catch { return undefined; } } return undefined; },
      z.array(z.string().uuid()).optional()
    ),
  }).refine((d) => Object.keys(d).length > 0, { message: "At least one field required" }),
});

export const quizIdParamSchema = z.object({
  params: z.object({ quizId: z.string().uuid("Invalid Quiz ID") }),
});

// ── Quiz Attempt ──────────────────────────────────────────────────────────────

export const submitQuizSchema = z.object({
  params: z.object({ quizId: z.string().uuid("Invalid Quiz ID") }),
  body: z.object({
    answers: z.preprocess(
      (v) => { if (Array.isArray(v)) return v; if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } } return []; },
      z.array(z.object({
        questionId: z.string().uuid(),
        answer: z.string(), // index string for MCQ, "true"/"false", text for FILL_BLANK/CODING
      })).min(1, "Answers are required")
    ),
    timeTaken: z.coerce.number().int().nonnegative().optional(),
  }),
});
