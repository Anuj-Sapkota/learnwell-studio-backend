import type { User } from "../generated/prisma/client.js";

/**
 * Standardizes the authentication response across the app.
 * Removes sensitive fields.
 */
export const formatAuthResponse = (user: User, accessToken: string) => {
  // destructuring to pull out password and any other sensitive fields
  const { password_hash, ...userWithoutPassword } = user;

  return {
    success: true,
    message: "Authentication successful",
    data: {
      user: userWithoutPassword,
      accessToken, // access token send with JSON
    },
  };
};
