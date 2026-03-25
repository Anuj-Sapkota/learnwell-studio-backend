import { z } from "zod";

// schema for the course creation
export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 chars"),
    shortDescription: z.string().min(10, "Summary is too short"),
    description: z.string().trim().nullable().default(null),
    price: z.coerce.number().nonnegative("Price cannot be negative"),
    category: z.string(),
    //stats
    videoCount: z.coerce.number().int().nonnegative().default(0),
    notesCount: z.coerce.number().int().nonnegative().default(0),
    //Duration with regex
    totalDuration: z.coerce.number().int().nonnegative().default(0),
  }),
});

//  Generic schema for any route that just needs a valid UUID in params
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

//  Add Section Schema
export const addSectionSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID format"),
  }),
  body: z.object({
    title: z.string().min(1, "Section title is required"),
  }),
});

//  Create Lesson Schema
export const createLessonSchema = z.object({
  params: z.object({
    sectionId: z.string().uuid("Invalid Section ID format"),
  }),
  body: z.object({
    title: z.string().min(3, "Lesson title must be at least 3 chars"),
    content: z.string().optional(),
  }),
});

//  Enrollment Schema
export const enrollInCourseSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID format"),
  }),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>["body"];
export type AddSectionInput = z.infer<typeof addSectionSchema>["body"];
