/**
 * Standardizes the authentication response across the app.
 * Removes sensitive fields.
 */
export const formatAuthResponse = (accessToken: string) => {
  // destructuring to pull out password and any other sensitive fields
  return {
    success: true,
    message: "Authentication successful",
    data: {
      accessToken, // access token send with JSON
    },
  };
};
