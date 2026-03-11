import type { Request, Response } from "express";
import { register } from "../services/auth.service.js";
import { generateTokens, setRefreshCookie } from "../utils/tokens.utils.js";
import { formatAuthResponse } from "../helpers/format-auth-response.helper.js";

export const registerUser = async (req: Request, res: Response): Promise<any> => {
  try {
    const { fullName, email, password } = req.body;

    // 1. Service gives  the RAW data
    const newUser = await register({ fullName, email, password });

    // 2. security layers
    const { accessToken, refreshToken } = generateTokens(newUser.id, newUser.role);
    setRefreshCookie(res, refreshToken);
    // 3. sanitize the data and send it to response
    return res.status(201).json(
      formatAuthResponse(newUser, accessToken)
    );

  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};