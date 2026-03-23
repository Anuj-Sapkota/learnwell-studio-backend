import { z } from "zod";

// We wrap everything in a 'body' object because that's what our middleware expects
export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 chars"),
    shortDescription: z.string().min(10, "Summary is too short"),
    description: z.string().trim().nullable().default(null),
    price: z.number().nonnegative("Price cannot be negative"),
    category: z.string(),
    //stats
    lectureCount: z.number().int().nonnegative().default(0),
    notesCount: z.number().int().nonnegative().default(0),
    //Duration with regex
    duration: z
      .string()
      .regex(/^\d+h \d+m \d+s$/, "Format must be: 00h 00m 00s")
      .default("0h 0m 0s"),
  }),
});

export const addSectionSchema = z.object({
  params: z.object({
    courseId: z.string().uuid("Invalid Course ID format"), // Or .regex() for MongoDB
  }),
  body: z.object({
    title: z.string().min(1, "Section title is required"),
  }),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>["body"];
export type AddSectionInput = z.infer<typeof addSectionSchema>["body"];
