import express from "express";
import {
  getMe,
  googleLogin,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "../controllers/auth.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";
import { protect } from "../middleware/auth.middleware.js";

const route = express.Router();

/**
 * @desc    Register a new user and create their profile
 * @route   POST /api/auth/register
 * @access  Public
 * @body    { string } fullName - The user's full name
 * @body    { string } email - Unique email address
 * @body    { string } password - Minimum 8 characters and max 40
 * @returns { object } 201 - User object and Access Token
 */

route.post("/register", validate(registerSchema), registerUser);

/**
 * @desc    Authenticate user and create session
 * @route   POST /api/auth/login
 * @access  Public
 * @body    { string } email - User's registered email
 * @body    { string } password - User's password
 * @returns { object } 200 - User object and Access Token
 */
route.post("/login", validate(loginSchema), loginUser);

/**
 * @desc    Logout user and invalidate session
 * @route   POST /api/auth/logout
 * @access  Private (Requires Refresh Token)
 * @returns { object } 200 - Success message
 */
route.post("/logout", logoutUser);

/**
 * @desc    Get new Access Token using Refresh Token
 * @route   POST /api/auth/refresh
 * @access  Public (Uses HttpOnly Cookie)
 * @returns { object } 200 - New Access Token
 */
route.post("/refresh", refreshAccessToken);

/**
 * @desc Logins with google and if account is new creates a new account
 * @route POST /api/auth/google
 * @access Public access
 * @returns { object } 200 - Success Message
 */
route.post("/google", googleLogin);

// get me route which runs after login
route.get("/me", protect, getMe);


// --- Password Recovery ---
route.post("/forgot-password", forgotPassword);
route.post("/reset-password/:token", resetPassword);

// --- Email Verification ---
route.get("/verify-email/:token", verifyEmail);
route.post("/resend-verification", protect, resendVerification);

export default route;
