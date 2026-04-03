import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { ServiceError } from "../errors/service.error.js";

/**
 * PROTECT: Verifies the Access Token from the Authorization Header or ?token= query param.
 * The query param fallback is needed for iframe src URLs which cannot send custom headers.
 */
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let token: string | undefined;

    // 1. Check Authorization header first
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2. Fallback to query param (used by iframe src for document proxy)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "You are not logged in. Please login to get access.",
      });
    }

    // 3. Verify token
    const decoded = jwt.verify(token, config.accessToken.accessSecret) as {
      userId: string;
      role: string;
    };

    // 4. Attach user data to the request
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

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

/**
 * REQUIRE VERIFIED: Blocks unverified users from accessing protected routes.
 * Must be used after `protect`.
 */
export const requireVerified = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { prisma } = await import("../lib/prisma.js");
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { isVerified: true },
    });

    if (!user?.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address before accessing this feature.",
      });
    }

    next();
  } catch {
    next();
  }
};
