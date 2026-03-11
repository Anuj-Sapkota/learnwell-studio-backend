import express from "express";
import cookieParser from "cookie-parser";

import config from "./config/config.js";
import authRouter from "./routes/auth.routes.js";

const app = express();

const { port, host } = config;

app.use(cookieParser());
app.use(express.json());

//register
app.use("/api/auth", authRouter);

app.listen(Number(port), host, () => {
  console.log(`Server running at http://${host}:${port}...`);
});
