export interface AuthUser {
  user: {
    id: string;
    email: string;
    fullName: string;
    username: string;
    role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
    token?: string;
  };
}
