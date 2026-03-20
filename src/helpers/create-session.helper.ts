import { prisma } from "../lib/prisma.js";
import { generateTokens } from "../utils/tokens.utils.js";

export const createSession = async (user: any, ip: string, userAgent: string, deviceType?: string) => {
  // 1. Generate Tokens
  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  // 2. Create Device Session in DB
  await prisma.deviceSession.create({
    data: {
      userId: user.id,
      token: refreshToken,
      ipAddress: ip,
      deviceType: deviceType || "unknown",
      userAgent: userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days
    },
  });

  return { accessToken, refreshToken };
};