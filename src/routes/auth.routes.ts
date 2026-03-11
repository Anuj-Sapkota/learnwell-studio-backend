import express from 'express';
import { registerUser } from '../controllers/auth.controller.js';

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

export default route;