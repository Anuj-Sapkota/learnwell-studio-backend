import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(3, "Name must be at least 3 characters").max(50, "Name is too long"),
    email: z.string().email("Invalid email format").trim().toLowerCase(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format").trim().toLowerCase(),
    password: z.string().min(1, "Password is required"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email("Please provide a valid email address").trim().toLowerCase(),
  }),
});

export const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1, "Reset token is required"),
  }),
  body: z.object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
  }),
});

export const verifyEmailSchema = z.object({
  params: z.object({
    token: z.string().min(1, "Verification token is required"),
  }),
});

export const googleAuthSchema = z.object({
  body: z.object({
    idToken: z.string().min(1, "Google ID token is required"),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>["body"];
