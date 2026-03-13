import type { Request, Response } from "express";
import { z } from "zod";

import { login, register, logout } from "../services/auth.service.js";
import { setRefreshCookie } from "../utils/tokens.utils.js";
import { formatAuthResponse } from "../helpers/format-auth-response.helper.js";
import { loginSchema, registerSchema } from "../utils/auth.validator.js";
import { refreshSession } from "../services/auth.service.js";

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

//Login controller
export const loginUser = async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const ip = req.ip || "0.0.0.0";
    const userAgent = req.get("User-Agent") || "unknown";

    const { user, accessToken, refreshToken } = await login({
      ...validatedData,
      ip,
      userAgent,
    });

    setRefreshCookie(res, refreshToken);
    return res.status(200).json(formatAuthResponse(user, accessToken));
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const formattedErrors: Record<string, string> = {};
      err.issues.forEach((issue) => {
        const key = issue.path[0];
        if (typeof key === "string") formattedErrors[key] = issue.message;
      });
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          errors: formattedErrors,
        });
    }
    return res
      .status(err.status || 500)
      .json({ success: false, message: err.message });
  }
};

//Logout the user, clear his refresh and access token
export const logoutUser = async (req: Request, res: Response) => {
  try {
    // 1. Get the token from cookies
    const refreshToken = req.cookies.refreshToken;

    // 2. Remove from Database
    if (refreshToken) {
      await logout(refreshToken);
    }

    // 3. Clear the cookie from the browser
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "An error occurred during logout",
    });
  }
};

// Create new access token

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    // if refresh token does not exist
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }
    // if refresh token does exists
    const { accessToken } = await refreshSession(refreshToken);

    return res.status(200).json({
      success: true,
      accessToken, // Send the new short-lived token to the frontend
    });
  } catch (err: any) {
    // If the refresh token is invalid/expired, clear the cookie so the frontend redirects to login
    res.clearCookie("refreshToken");
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Could not refresh session",
    });
  }
};
