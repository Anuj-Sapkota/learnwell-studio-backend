import type { NextFunction, Request, Response } from "express";

import {
  login,
  register,
  logout,
  googleAuthService,
  refreshSession,
  getMeService,
  generateResetToken,
  verifyAndResetPassword,
} from "../services/auth.service.js";
import { setRefreshCookie } from "../utils/tokens.utils.js";
import { formatAuthResponse } from "../helpers/format-auth-response.helper.js";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema.js";
import { sendResetEmail } from "../utils/email.util.js";

export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> => {
  try {
    console.log("Reached controller");
    // 1. req.body is already validated by middleware
    const validatedData = req.body as RegisterInput;

    // 2. Extract network info
    const ip = req.ip || req.socket?.remoteAddress || "0.0.0.0";
    const userAgent = req.get("User-Agent") || "unknown";

    // 3. Call the service
    const { accessToken, refreshToken } = await register({
      ...validatedData,
      ip,
      userAgent,
    });
    
    // 4. Security layers & Response
    setRefreshCookie(res, refreshToken);
    return res.status(201).json(formatAuthResponse(accessToken));
  } catch (error: any) {
    next(error);
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
    return res.status(200).json(formatAuthResponse(accessToken));
  } catch (error: any) {
    next(error);
  }
};

// login with google
export const googleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

    return res.status(200).json(formatAuthResponse(accessToken));
  } catch (error: any) {
    console.error("Google Auth Error:", error);
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 'req.user.userId' comes from your 'protect' middleware
    const userId = (req as any).user.userId;

    const user = await getMeService(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

//Logout the user, clear his refresh and access token
export const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
  } catch (error: any) {
    next(error);
  }
};

// Create new access token

export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
  } catch (error: any) {
    // If the refresh token is invalid/expired, clear the cookie so the frontend redirects to login
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    next(error);
  }
};


export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const result = await generateResetToken(email);
    await sendResetEmail(result.userEmail, result.token);
    res.status(200).json({ success: true, message: "If an account exists, a reset link has been sent." });
  } catch (err: any) {
    // User not found — still return 200 to avoid email enumeration
    if (err?.statusCode === 200) {
      return res.status(200).json({ success: true, message: err.message });
    }
    next(err);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    await verifyAndResetPassword(String(token), password);
    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (err) {
    next(err);
  }
};