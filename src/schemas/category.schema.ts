import { z } from "zod";

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Category name must be at least 2 characters").max(50, "Category name is too long"),
    description: z.string().trim().max(200, "Description is too long").optional(),
  }),
});

export const categoryIdParamSchema = z.object({
  params: z.object({
    categoryId: z.string().uuid("Invalid category ID format"),
  }),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>["body"];
