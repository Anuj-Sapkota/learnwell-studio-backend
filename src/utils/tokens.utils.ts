import jwt, { type SignOptions } from "jsonwebtoken";
import type { Response } from "express";
import config from "../config/config.js";

export const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "15Minutes" },
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7D" }, //
  );

  return { accessToken, refreshToken };
};

export const setRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // Prevents XSS (JavaScript can't read this)
    secure: process.env.NODE_ENV === "production", // Only sends over HTTPS
    sameSite: "strict", // Prevents CSRF
    maxAge: config.cookie.maxAge as any, // 7 days in ms  });
  });
};
