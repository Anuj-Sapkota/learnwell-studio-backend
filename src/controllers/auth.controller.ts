import type { Request, Response } from "express";
import { register } from "../services/auth.service.js";
import { generateTokens, setRefreshCookie } from "../utils/tokens.utils.js";
import { formatAuthResponse } from "../helpers/format-auth-response.helper.js";

export const registerUser = async (
  req: Request,
  res: Response,
): Promise<any> => {
  try {
    const { fullName, email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || "0.0.0.0";
    const userAgent = req.get("User-Agent") || "unknown";

    // 1. Service gives  the RAW data
    const { user } = await register({
      fullName,
      email,
      password,
      ip,
      userAgent,
    });
    // 2. security layers
    const { accessToken, refreshToken } = generateTokens(user.id, user.role);
    setRefreshCookie(res, refreshToken);
    // 3. sanitize the data and send it to response
    return res.status(201).json(formatAuthResponse(user, accessToken));
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};
