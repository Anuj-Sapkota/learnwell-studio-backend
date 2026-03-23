import { ServiceError } from "../errors/service.error.js";
import { hashPassword, verifyPassword } from "../utils/password.util.js";
import { prisma } from "../lib/prisma.js";
import { generateTokens } from "../utils/tokens.utils.js";
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
  deviceType: string;
}

/**
 * Registers a user, creates a profile, and initializes a device session.
 */
export const register = async ({
  fullName,
  email,
  password,
  ip,
  userAgent,
  deviceType,
}: RegisterInputProps): Promise<{
  user: User;
  accessToken: string;
  refreshToken: string;
}> => {
  // if user exists
  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    throw new ServiceError("User already exists!", 409);
  }

  // 2. Database Transaction
  return await prisma.$transaction(async (tx) => {
    // A. Create the User
    const newUser = await tx.user.create({
      data: {
        fullName,
        email,
        password_hash: await hashPassword(password),
      },
    });

    // B. Create the Profile
    await tx.profile.create({
      data: { userId: newUser.id },
    });
    
    const { accessToken, refreshToken } = await createSession(
      newUser,
      ip,
      userAgent,
      tx
    );

    return { user: newUser, accessToken, refreshToken };
  });
};

/**
 * Logins a user
 */

export const login = async ({
  email,
  password,
  ip,
  userAgent,
  deviceType,
}: any) => {
  // 1. Find the user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ServiceError("Invalid email or password", 401);
  }

  // 2. Check Password
  const isPasswordValid = await verifyPassword(password, user.password_hash!);
  if (!isPasswordValid) {
    throw new ServiceError("Invalid email or password", 401);
  }

  // 3. Generate Tokens
  const { accessToken, refreshToken } = await createSession(
    user,
    ip,
    userAgent,
  );

  return { user, accessToken, refreshToken };
};

const client = new OAuth2Client(config.google.clientId);

export const googleAuthService = async (
  idToken: string,
  ip: string,
  userAgent: string,
) => {
  // 1. Verify the token with Google
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.google.clientId!,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw { status: 400, message: "Invalid Google Account" };
  }

  const { email, name } = payload;

  // 2. Find or Create the user
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        fullName: name || "Google User",
        // password remains null for Google users
      },
    });
  }

  // 3. Create Session & Tokens
  const { accessToken, refreshToken } = await createSession(
    user,
    ip,
    userAgent,
  );

  return { user, accessToken, refreshToken };
};

/**
 * Deletes the session from the database so the refresh token
 * cannot be used to generate new access tokens.
 */
export const logout = async (refreshToken: string) => {
  if (!refreshToken) return;

  // Delete the session associated with this specific refresh token
  await prisma.deviceSession.deleteMany({
    where: {
      token: refreshToken,
    },
  });
};

/**
 * Checks if refresh token exists in the database and deletes the expired token and creates a new accessToken if refresh token is not expired
 */
export const refreshSession = async (refreshToken: string) => {
  // 1. Check if token exists in DB
  const session = await prisma.deviceSession.findUnique({
    where: { token: refreshToken },
    include: { user: true }, // Get user data at the same time
  });

  if (!session) {
    throw new ServiceError("Session not found or invalid", 401);
  }

  // 2. Check if session is expired
  if (new Date() > session.expiresAt) {
    // delete expired session from DB
    await prisma.deviceSession.delete({ where: { id: session.id } });
    throw new ServiceError("Session expired, please login again", 401);
  }

  // 3. Generate a fresh Access Token
  const { accessToken } = generateTokens(session.user.id, session.user.role);

  return { accessToken };
};
