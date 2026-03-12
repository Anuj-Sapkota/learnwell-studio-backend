import { ServiceError } from "../errors/service.error.js";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../constants/auth.constants.js";
import { hashPassword, verifyPassword } from "../utils/password.util.js";
import { prisma } from "../lib/prisma.js";
import { generateTokens } from "../utils/tokens.utils.js";
import type { User } from "../generated/prisma/client.js";

interface RegisterInputProps {
  fullName: string;
  email: string;
  password: string;
  ip: string;        
  userAgent: string;
}

/**
 * Registers a user, creates a profile, and initializes a device session.
 */
export const register = async ({
  fullName,
  email,
  password,
  ip,
  userAgent
}: RegisterInputProps): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
  
  
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

    // C. Generate Tokens
    const { accessToken, refreshToken } = generateTokens(newUser.id, newUser.role);

    // D. Create Device Session
    // This links the specific laptop/browser to the refresh token
    await tx.deviceSession.create({
      data: {
        userId: newUser.id,
        token: refreshToken, // Storing the refresh token for revocation support
        ipAddress: ip,
        userAgent: userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days
      },
    });

    return { user: newUser, accessToken, refreshToken };
  });
};


/**
 * Logins a user
 */

export const login = async ({ email, password, ip, userAgent }: any) => {
  // 1. Find the user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ServiceError("Invalid email or password", 401);
  }

  // 2. Check Password
  const isPasswordValid = await verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    throw new ServiceError("Invalid email or password", 401);
  }

  // 3. Generate Tokens
  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  // 4. Create Device Session (for tracking/revocation)
  await prisma.deviceSession.create({
    data: {
      userId: user.id,
      token: refreshToken,
      ipAddress: ip,
      userAgent: userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days
    },
  });

  return { user, accessToken, refreshToken };
};