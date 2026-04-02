import { z } from "zod";

// schema for the course creation
export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 chars"),
    shortDescription: z.string().min(10, "Summary is too short"),
    description: z.string().trim().nullable().default(null),
    price: z.coerce.number().nonnegative("Price cannot be negative").default(0),
    discount: z.coerce.number().min(0).max(100, "Discount must be between 0-100").default(0),
    isFree: z.coerce.boolean().default(false),
    accessDuration: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().int().positive().nullable()
    ).default(null), // days; null = lifetime
    categoryId: z.string().uuid("Invalid category ID — pick a valid category"),
    level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).default("BEGINNER"),
    // stats
    videoCount: z.coerce.number().int().nonnegative().default(0),
    notesCount: z.coerce.number().int().nonnegative().default(0),
    totalDuration: z.coerce.number().int().nonnegative().default(0),
    prerequisites: z.preprocess(
      (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === "string") {
          try { return JSON.parse(val); } catch { return val.split(",").map((s) => s.trim()).filter(Boolean); }
        }
        return [];
      },
      z.array(z.string()).default([])
    ),
  }),
});

// Generic schema for any route that just needs a valid UUID in params
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

// Add Section Schema
export const addSectionSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID format"),
  }),
  body: z.object({
    title: z.string().min(1, "Section title is required"),
  }),
});

// Update Section Schema
export const updateSectionSchema = z.object({
  params: z.object({
    sectionId: z.string().uuid("Invalid Section ID format"),
  }),
  body: z.object({
    title: z.string().min(1, "Section title is required").optional(),
    order: z.coerce.number().int().nonnegative().optional(),
  }),
});

// Create Lesson Schema
export const createLessonSchema = z.object({
  params: z.object({
    sectionId: z.string().uuid("Invalid Section ID format"),
  }),
  body: z.object({
    title: z.string().min(3, "Lesson title must be at least 3 chars"),
    content: z.string().optional(),
  }),
});

// Update Lesson Schema
export const updateLessonSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid("Invalid Lesson ID format"),
  }),
  body: z.object({
    title: z.string().min(3, "Lesson title must be at least 3 chars").optional(),
    content: z.string().optional(),
    order: z.coerce.number().int().nonnegative().optional(),
  }),
});

// Enrollment Schema
export const enrollInCourseSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID format"),
  }),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>["body"];
export type AddSectionInput = z.infer<typeof addSectionSchema>["body"];
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>["body"];
