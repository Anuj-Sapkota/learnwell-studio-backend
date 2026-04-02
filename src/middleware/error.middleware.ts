import type { Request, Response, NextFunction } from "express";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Log the full error to your TERMINAL so you can see it
  console.error("DEBUG ERROR LOG:", err);

  // 2. Extract a clean message
  const statusCode = err.status || 500;
  let message = err.message || "Internal Server Error";

  // 3. Specifically handle Zod/Validation errors
  if (err.name === "ZodError" || err.issues) {
    const errors = err.issues.map((issue: any) => {
      // Strip leading "body" / "params" / "query" from path
      const path = issue.path.filter((p: any) => !["body", "params", "query"].includes(p)).join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    });
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  // 4. Specifically handle Multer errors (unexpected fields, etc.)
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    message = `Unexpected field: ${err.field}. Check your field names!`;
  }

  // 5. Send a clean JSON response instead of HTML
  res.status(statusCode).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};