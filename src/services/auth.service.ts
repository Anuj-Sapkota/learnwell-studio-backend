import { ServiceError } from "../errors/service.error.js";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../constants/auth.constants.js";
import { hashPassword } from "../utils/password.util.js";
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
  
  // 1. Validation Logic
  if (!fullName || !email || !password) {
    throw new ServiceError("Missing required fields", 400);
  }

  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    throw new ServiceError("User already exists!", 409);
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new ServiceError(
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      400
    );
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