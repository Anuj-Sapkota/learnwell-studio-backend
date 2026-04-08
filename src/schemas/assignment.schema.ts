import { z } from "zod";

export const createAssignmentSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID format"),
  }),
  body: z.object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
    description: z.string().trim().optional(),
    type: z.enum(["FILE_SUBMISSION", "MCQ"]).default("FILE_SUBMISSION"),
    dueDate: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : new Date(val as string)),
      z.date().nullable()
    ).default(null),
    // MCQ questions: [{ question, options: string[], correctIndex: number }]
    questions: z.preprocess(
      (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === "string") { try { return JSON.parse(val); } catch { return []; } }
        return [];
      },
      z.array(z.object({
        question: z.string().min(1, "Question text is required"),
        options: z.array(z.string().min(1)).min(2, "At least 2 options required"),
        correctIndex: z.number().int().nonnegative("Correct index must be a non-negative integer"),
      })).default([])
    ),
  }),
});

export const updateAssignmentSchema = z.object({
  params: z.object({
    assignmentId: z.string().uuid("Invalid Assignment ID format"),
  }),
  body: z.object({
    title: z.string().trim().min(3).max(150).optional(),
    description: z.string().trim().optional(),
    dueDate: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : new Date(val as string)),
      z.date().nullable()
    ).optional(),
  }).refine((d) => Object.keys(d).length > 0, { message: "At least one field required" }),
});

export const assignmentIdParamSchema = z.object({
  params: z.object({
    assignmentId: z.string().uuid("Invalid Assignment ID format"),
  }),
});

export const gradeSubmissionSchema = z.object({
  params: z.object({
    submissionId: z.string().uuid("Invalid Submission ID format"),
  }),
  body: z.object({
    grade: z.coerce.number().min(0, "Grade cannot be negative"),
    maxGrade: z.coerce.number().positive("Max grade must be positive").default(100),
    feedback: z.string().trim().max(1000, "Feedback is too long").optional(),
  }),
});

export const submitAssignmentSchema = z.object({
  params: z.object({
    assignmentId: z.string().uuid("Invalid Assignment ID format"),
  }),
  body: z.object({
    textContent: z.string().trim().optional(),
    // MCQ answers: [{ questionIndex, selectedIndex }]
    mcqAnswers: z.preprocess(
      (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === "string") { try { return JSON.parse(val); } catch { return undefined; } }
        return undefined;
      },
      z.array(z.object({
        questionIndex: z.number().int().nonnegative(),
        selectedIndex: z.number().int().nonnegative(),
      })).optional()
    ),
  }),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>["body"];

export const updateProgressSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid("Invalid Lesson ID format"),
  }),
  body: z.object({
    watchedPercent: z.coerce.number().min(0).max(100, "Watched percent must be between 0 and 100"),
  }),
});
