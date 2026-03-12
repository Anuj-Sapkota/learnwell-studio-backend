import express from "express";
import { loginUser, registerUser } from "../controllers/auth.controller.js";

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

route.post("/register", registerUser);

/**
 * @desc    Authenticate user and create session
 * @route   POST /api/auth/login
 * @access  Public
 * @body    { string } email - User's registered email
 * @body    { string } password - User's password
 * @returns { object } 200 - User object and Access Token
 */
route.post("/login", loginUser);

export default route;
