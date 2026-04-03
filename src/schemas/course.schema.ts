import { z } from "zod";

// ─── Reusable field definitions ───────────────────────────────────────────────

const prerequisitesField = z.preprocess(
  (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return val.split(",").map((s: string) => s.trim()).filter(Boolean); }
    }
    return [];
  },
  z.array(z.string().min(1)).default([])
);

const accessDurationField = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
  z.number().int().positive("Access duration must be a positive number of days").nullable()
).default(null);

// ─── Course Schemas ────────────────────────────────────────────────────────────

export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(150, "Title is too long"),
    shortDescription: z.string().trim().min(10, "Short description is too short").max(300, "Short description is too long"),
    description: z.string().trim().nullable().default(null),
    price: z.coerce.number().nonnegative("Price cannot be negative").default(0),
    discount: z.coerce.number().min(0).max(100, "Discount must be between 0 and 100").default(0),
    isFree: z.coerce.boolean().default(false),
    accessDuration: accessDurationField,
    categoryId: z.string().uuid("Invalid category — please select a valid category"),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"], {
      message: "Level must be BEGINNER, INTERMEDIATE, or ADVANCED",
    }).default("BEGINNER"),
    videoCount: z.coerce.number().int().nonnegative().default(0),
    notesCount: z.coerce.number().int().nonnegative().default(0),
    totalDuration: z.coerce.number().int().nonnegative().default(0),
    prerequisites: prerequisitesField,
  }),
});

export const updateCourseSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID format"),
  }),
  body: z.object({
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(150).optional(),
    shortDescription: z.string().trim().min(10).max(300).optional(),
    description: z.string().trim().nullable().optional(),
    price: z.coerce.number().nonnegative("Price cannot be negative").optional(),
    discount: z.coerce.number().min(0).max(100, "Discount must be between 0 and 100").optional(),
    isFree: z.coerce.boolean().optional(),
    accessDuration: accessDurationField.optional(),
    categoryId: z.string().uuid("Invalid category ID").optional(),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
    prerequisites: prerequisitesField.optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  }),
});

// ─── Param Schemas ─────────────────────────────────────────────────────────────

export const courseIdParamSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID format"),
  }),
});

export const sectionIdParamSchema = z.object({
  params: z.object({
    sectionId: z.string().uuid("Invalid Section ID format"),
  }),
});

export const lessonIdParamSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid("Invalid Lesson ID format"),
  }),
});

// ─── Section Schemas ───────────────────────────────────────────────────────────

export const addSectionSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID format"),
  }),
  body: z.object({
    title: z.string().trim().min(1, "Section title is required").max(150, "Section title is too long"),
  }),
});

export const updateSectionSchema = z.object({
  params: z.object({
    sectionId: z.string().uuid("Invalid Section ID format"),
  }),
  body: z.object({
    title: z.string().trim().min(1, "Section title is required").max(150).optional(),
    order: z.coerce.number().int().nonnegative().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  }),
});

// ─── Lesson Schemas ────────────────────────────────────────────────────────────

export const createLessonSchema = z.object({
  params: z.object({
    sectionId: z.string().uuid("Invalid Section ID format"),
  }),
  body: z.object({
    title: z.string().trim().min(3, "Lesson title must be at least 3 characters").max(150, "Lesson title is too long"),
    // Rich text HTML — stored as-is, rendered on frontend with dangerouslySetInnerHTML or a viewer
    content: z.string().trim().optional(),
    contentType: z.enum(["VIDEO", "PDF", "TEXT", "MIXED"]).default("TEXT"),
  }),
});

export const updateLessonSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid("Invalid Lesson ID format"),
  }),
  body: z.object({
    title: z.string().trim().min(3, "Lesson title must be at least 3 characters").max(150).optional(),
    content: z.string().trim().optional(),
    contentType: z.enum(["VIDEO", "PDF", "TEXT", "MIXED"]).optional(),
    order: z.coerce.number().int().nonnegative().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  }),
});

// ─── Enrollment Schema ─────────────────────────────────────────────────────────

export const enrollInCourseSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID format"),
  }),
});

// ─── Search / Query Schema ─────────────────────────────────────────────────────

export const courseSearchSchema = z.object({
  query: z.object({
    search: z.string().trim().max(100).optional(),
    categoryId: z.string().uuid("Invalid category ID").optional(),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  }),
});

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CreateCourseInput = z.infer<typeof createCourseSchema>["body"];
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>["body"];
export type AddSectionInput = z.infer<typeof addSectionSchema>["body"];
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>["body"];
export type CourseSearchQuery = z.infer<typeof courseSearchSchema>["query"];
