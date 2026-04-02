import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import config from "./config/config.js";
import authRouter from "./routes/auth.routes.js";
import courseRouter from "./routes/courses.routes.js";
import categoryRouter from "./routes/category.routes.js";
import { globalErrorHandler } from "./middleware/error.middleware.js";

const app = express();

const { port, host } = config;

app.use(cookieParser());

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        "http://localhost:8080",
        "http://localhost:5173",
        "https://zona-multijugate-cherie.ngrok-free.dev"
      ];
      // Allow any ngrok tunnel or no origin (Postman, mobile, etc.)
      if (!origin || allowed.includes(origin) || origin.endsWith(".ngrok-free.app") || origin.endsWith(".ngrok-free.dev")) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "ngrok-skip-browser-warning"],
  }),
);


app.use(express.json());

//Auth
app.use("/api/auth", authRouter);

// Courses
app.use("/api/course", courseRouter);

// Categories
app.use("/api/categories", categoryRouter);


// global error handler
app.use(globalErrorHandler);
app.listen(Number(port), host, () => {
  console.log(`Server running at http://${host}:${port}...`);
});
