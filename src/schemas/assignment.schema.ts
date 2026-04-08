import { z } from "zod";

export const createAssignmentSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID format"),
  }),
  body: z.object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(150),
    description: z.string().trim().optional(),
    dueDate: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : new Date(val as string)),
      z.date().nullable()
    ).default(null),
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
  }),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>["body"];
