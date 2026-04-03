import jwt, { type SignOptions } from "jsonwebtoken";
import type { Response } from "express";
import config from "../config/config.js";

export const generateTokens = (userId: string, role: string) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "1m" },  
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: "7d" },
  );

  return { accessToken, refreshToken };
};

export const setRefreshCookie = (res: Response, refreshToken: string) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isCrossOrigin = process.env.CROSS_ORIGIN === "true"; // set this in .env when using ngrok

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProduction || isCrossOrigin,
    sameSite: isCrossOrigin ? "none" : "strict",
    maxAge: config.cookie.maxAge as any,
  });
};
