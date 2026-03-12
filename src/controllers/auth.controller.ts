import type { Request, Response } from "express";
import { z } from "zod";
import { register } from "../services/auth.service.js";
import { setRefreshCookie } from "../utils/tokens.utils.js";
import { formatAuthResponse } from "../helpers/format-auth-response.helper.js";
import { registerSchema } from "../utils/auth.validator.js";

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    // 1. Validate the request body using Zod
    const validatedData = registerSchema.parse(req.body);

    // 2. Extract network info
    const ip = req.ip || req.socket?.remoteAddress || "0.0.0.0";
    const userAgent = req.get("User-Agent") || "unknown";

    // 3. Call the service (Pass validatedData)
    // We destructure tokens directly from the service result
    const { user, accessToken, refreshToken } = await register({
      ...validatedData,
      ip,
      userAgent,
    });

    // 4. Security layers (Use the refreshToken from the service/database)
    setRefreshCookie(res, refreshToken);

    // 5. Sanitize and respond
    return res.status(201).json(formatAuthResponse(user, accessToken));
  } catch (err: any) {
    // Handle Zod Validation Errors specifically
    if (err instanceof z.ZodError) {
      const formattedErrors: Record<string, string> = {};

      err.issues.forEach((issue) => {
        const key = issue.path[0];

        // Check if the key exists and is a string to satisfy TypeScript
        if (typeof key === "string") {
          formattedErrors[key] = issue.message;
        }
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formattedErrors,
      });
    }

    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};
