import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

const isDev = process.env.NODE_ENV === "development";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Always log in dev, only log unexpected errors in prod
  if (isDev || (!err.statusCode && err.statusCode !== 200)) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);
  }

  // ── 1. Zod Validation Errors ──────────────────────────────────────────────
  if (err.name === "ZodError" || err.issues) {
    const errors = err.issues.map((issue: any) => {
      const path = issue.path
        .filter((p: any) => !["body", "params", "query"].includes(String(p)))
        .join(".");
      return { field: path || null, message: issue.message };
    });
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Validation failed. Please check the errors below.",
      errors,
    });
  }

  // ── 2. Prisma Known Request Errors ────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        // Unique constraint violation
        const field = (err.meta?.target as string[])?.join(", ") ?? "field";
        return res.status(409).json({
          success: false,
          code: "DUPLICATE_ENTRY",
          message: `A record with this ${field} already exists.`,
        });
      }
      case "P2025":
        // Record not found
        return res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: "The requested resource was not found.",
        });
      case "P2003":
        // Foreign key constraint
        return res.status(400).json({
          success: false,
          code: "INVALID_REFERENCE",
          message: "Referenced resource does not exist.",
        });
      case "P2014":
        return res.status(400).json({
          success: false,
          code: "RELATION_VIOLATION",
          message: "This operation would violate a required relation.",
        });
      default:
        return res.status(500).json({
          success: false,
          code: "DATABASE_ERROR",
          message: "A database error occurred.",
          ...(isDev && { detail: err.message }),
        });
    }
  }

  // ── 3. Prisma Validation Errors ───────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      code: "DATABASE_VALIDATION_ERROR",
      message: "Invalid data provided to the database.",
      ...(isDev && { detail: err.message }),
    });
  }

  // ── 4. JWT Errors ─────────────────────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      code: "INVALID_TOKEN",
      message: "Invalid token. Please log in again.",
    });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      code: "TOKEN_EXPIRED",
      message: "Your session has expired. Please log in again.",
    });
  }

  // ── 5. Multer Errors ──────────────────────────────────────────────────────
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      code: "INVALID_FILE_FIELD",
      message: `Unexpected file field: "${err.field}". Check your upload field name.`,
    });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      code: "FILE_TOO_LARGE",
      message: "Uploaded file exceeds the size limit.",
    });
  }

  // ── 6. ServiceError (custom app errors) ──────────────────────────────────
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      code: "APPLICATION_ERROR",
      message: err.message,
    });
  }

  // ── 7. Fallback — unexpected errors ───────────────────────────────────────
  return res.status(500).json({
    success: false,
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong on our end. Please try again later.",
    ...(isDev && { stack: err.stack }),
  });
};
