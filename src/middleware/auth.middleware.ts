import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { ServiceError } from "../errors/service.error.js";

/**
 * PROTECT: Verifies the Access Token from the Authorization Header
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token;

    // 1. Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "You are not logged in. Please login to get access.",
      });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, config.accessToken.accessSecret) as {
      userId: string;
      role: string;
    };

    // 3. Attach user data to the request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    console.log("THis is the request user", req.user);

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token or session expired.",
    });
  }
};

/**
 * AUTHORIZE: Restricts access to specific roles (e.g., INSTRUCTOR, ADMIN)
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user?.role}) is not allowed to access this resource`,
      });
    }
    next();
  };
};
