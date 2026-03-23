import type { Request, Response } from "express";

import {
  login,
  register,
  logout,
  googleAuthService,
  refreshSession,
} from "../services/auth.service.js";
import { setRefreshCookie } from "../utils/tokens.utils.js";
import { formatAuthResponse } from "../helpers/format-auth-response.helper.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    console.log("Reached controller");
    // 1. req.body is already validated by middleware
    const validatedData = req.body as RegisterInput;

    // 2. Extract network info
    const ip = req.ip || req.socket?.remoteAddress || "0.0.0.0";
    const userAgent = req.get("User-Agent") || "unknown";

    // 3. Call the service
    const { user, accessToken, refreshToken } = await register({
      ...validatedData,
      ip,
      userAgent,
    });

    // 4. Security layers & Response
    setRefreshCookie(res, refreshToken);
    return res.status(201).json(formatAuthResponse(user, accessToken));
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    // 1. req.body is already validated by middleware
    console.log("Reached controller for login");

    const validatedData = req.body as LoginInput;

    // 2. Extract network and browser info
    const ip = req.ip || "0.0.0.0";
    const userAgent = req.get("User-Agent") || "unknown";

    // 3. Call the service
    const { user, accessToken, refreshToken } = await login({
      ...validatedData,
      ip,
      userAgent,
    });

    // 4. Security & Response
    setRefreshCookie(res, refreshToken);
    return res.status(200).json(formatAuthResponse(user, accessToken));
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

// login with google
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google Token is required",
      });
    }

    const ip = req.ip || "0.0.0.0";
    const userAgent = req.get("User-Agent") || "unknown";

    // Call the service
    const { user, accessToken, refreshToken } = await googleAuthService(
      idToken,
      ip,
      userAgent,
    );

    // Set cookie and respond
    setRefreshCookie(res, refreshToken);

    return res.status(200).json(formatAuthResponse(user, accessToken));
  } catch (err: any) {
    console.error("Google Auth Error:", err);
    return res.status(err.status || 401).json({
      success: false,
      message: err.message || "Google authentication failed",
    });
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
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(err.status || 401).json({
      // Default to 401 for refresh failures
      success: false,
      message: err.message || "Session expired, please login again",
      errors: {},
    });
  }
};
