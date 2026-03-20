import { z } from "zod";

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name is too long"),

  email: z.string().email("Invalid email format").trim().toLowerCase(),

  password: z
    .string({})
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  
    deviceType: z.enum(["Mobile", "Desktop", "Tablet"]).optional().default("Desktop"),
});

//Login schena
export const loginSchema = z.object({
  email: z.string().email("Invalid email format").trim().toLowerCase(),

  password: z.string().min(1, "Password is required"),
});

// This helps TypeScript know the shape of the validated data
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
