import dotenv from "dotenv";

dotenv.config();

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!accessSecret || !refreshSecret) {
  console.log(
    "Access Secret: ",
    accessSecret,
    "refresh Secret: ",
    refreshSecret,
  );
  throw new Error("Missing JWT env variables");
}

const config = {
  port: process.env.PORT || 5000,
  host: process.env.HOST || "0.0.0.0",
  saltRound: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,

  accessToken: {
    accessSecret,
    expiry: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  },

  refreshToken: {
    refreshSecret,
    expiry: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  },
  cookie: {
    maxAge: Number(process.env.COOKIE_MAX_AGE) || 7 * 24 * 60 * 60 * 1000,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET
  },
  resetLink: {
    emailHost: process.env.EMAIL_HOST!,
    emailPort: process.env.EMAIL_PORT!,
    emailUser: process.env.EMAIL_USER!,
    emailPassword: process.env.EMAIL_PASS!,
  },
};

export default config;
