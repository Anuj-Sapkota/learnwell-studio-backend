import bcrypt from "bcrypt";
import config from "../config/config.js";

//hashes the incoming plain password and returns it
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, config.saltRound);
}

//compares the incoming plain password and hashed password and returns boolean
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
