interface RegisterInputProps {
  fullName: string;
  email: string;
  password: string;
}
import { ServiceError } from "../errors/service.error.js";
// ---- User Registration ------

import type { AuthUser } from "../types/auth.types.js";

import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../constants/auth.constants.js";
import { hashPassword } from "../utils/password.util.js";
import { prisma } from "../lib/prisma.js";
import type { User } from "../generated/prisma/client.js";

export const register = async ({
  fullName,
  email,
  password,
}: RegisterInputProps): Promise<User> => {
  if (!fullName || !email || !password) {
    throw new ServiceError("Missing required fields", 400);
  }

  const userExists = await prisma.user.findFirst({
    where: { email }, // email for now
  });

  if (userExists) {
    throw new ServiceError("User already exists!", 409);
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new ServiceError(
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      400,
    );
  }

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      password_hash: await hashPassword(password),
    },
  });

  return user; // returns full user object
};
