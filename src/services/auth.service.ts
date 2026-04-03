import { ServiceError } from "../errors/service.error.js";
import { hashPassword, verifyPassword } from "../utils/password.util.js";
import { prisma } from "../lib/prisma.js";
import { generateTokens } from "../utils/tokens.utils.js";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import config from "../config/config.js";
import { OAuth2Client } from "google-auth-library";
import { createSession } from "../helpers/create-session.helper.js";

interface RegisterInputProps {
  fullName: string;
  email: string;
  password: string;
  ip: string;
  userAgent: string;
  deviceType?: string;
}

export const register = async ({
  fullName,
  email,
  password,
  ip,
  userAgent,
}: RegisterInputProps): Promise<{
  user: User;
  accessToken: string;
  refreshToken: string;
}> => {
  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) throw new ServiceError("User already exists!", 409);

  return await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { fullName, email, password_hash: await hashPassword(password) },
    });

    await tx.profile.create({ data: { userId: newUser.id } });

    const { accessToken, refreshToken } = await createSession(newUser, ip, userAgent, tx);
    return { user: newUser, accessToken, refreshToken };
  });
};

export const login = async ({ email, password, ip, userAgent }: any) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new ServiceError("Invalid email or password", 401);

  const isPasswordValid = await verifyPassword(password, user.password_hash!);
  if (!isPasswordValid) throw new ServiceError("Invalid email or password", 401);

  const { accessToken, refreshToken } = await createSession(user, ip, userAgent);
  return { user, accessToken, refreshToken };
};

const client = new OAuth2Client(config.google.clientId);

export const googleAuthService = async (idToken: string, ip: string, userAgent: string) => {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.google.clientId!,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) throw { status: 400, message: "Invalid Google Account" };

  const { email, name } = payload;

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email, fullName: name || "Google User" },
    });
  }

  const { accessToken, refreshToken } = await createSession(user, ip, userAgent);
  return { user, accessToken, refreshToken };
};

export const getMeService = async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });
};

export const logout = async (refreshToken: string) => {
  if (!refreshToken) return;
  await prisma.deviceSession.deleteMany({ where: { token: refreshToken } });
};

export const refreshSession = async (refreshToken: string) => {
  const session = await prisma.deviceSession.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!session) throw new ServiceError("Session not found or invalid", 401);

  if (new Date() > session.expiresAt) {
    await prisma.deviceSession.delete({ where: { id: session.id } });
    throw new ServiceError("Session expired, please login again", 401);
  }

  const { accessToken } = generateTokens(session.user.id, session.user.role);
  return { accessToken };
};

export const generateResetToken = async (
  email: string,
): Promise<{ token: string; userEmail: string }> => {
  const user = await prisma.user.findUnique({ where: { email } });

  // Security: don't reveal whether the email exists
  if (!user) {
    throw new ServiceError("If an account exists, a reset link has been sent.", 200);
  }

  // Sign a short-lived JWT — no DB storage needed
  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn: "1h" }
  );

  return { token, userEmail: user.email };
};

export const verifyAndResetPassword = async (
  token: string,
  newPassword: string,
): Promise<boolean> => {
  let payload: any;

  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
  } catch {
    throw new ServiceError("Invalid or expired reset token.", 400);
  }

  await prisma.user.update({
    where: { id: payload.userId },
    data: { password_hash: await hashPassword(newPassword) },
  });

  return true;
};

// Generate a short-lived JWT for email verification
export const generateVerificationToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET!, { expiresIn: "24h" });
};

// Verify the token and mark user as verified
export const verifyEmailService = async (token: string): Promise<void> => {
  let payload: any;

  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
  } catch {
    throw new ServiceError("Invalid or expired verification link.", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new ServiceError("User not found.", 404);
  if (user.isVerified) throw new ServiceError("Account is already verified.", 400);

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true },
  });
};

// Resend verification email
export const resendVerificationService = async (userId: string): Promise<{ email: string; token: string }> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ServiceError("User not found.", 404);
  if (user.isVerified) throw new ServiceError("Account is already verified.", 400);

  const token = generateVerificationToken(user.id);
  return { email: user.email, token };
};
