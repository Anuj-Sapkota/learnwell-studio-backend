export interface AuthUser {
  user: {
    userId: string;
    email: string;
    fullName: string;
    username: string;
    role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
    token?: string;
  };
}
