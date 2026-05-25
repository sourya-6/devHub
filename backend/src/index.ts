import express from "express"
import dotenv from "dotenv"
import cookieParser from "cookie-parser";
import { connectDB } from "./db/index.js";
import cors from "cors"
dotenv.config();
const app = express();
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:4200";

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

connectDB();
import userRouter from "./routes/auth.route.js"
import projectRouter from "./routes/project.route.js"
import notificationRouter from "./routes/notification.route.js"
app.use("/auth",userRouter)
app.use("/project",projectRouter)
app.use("/notifications", notificationRouter)
const PORT = process.env.PORT || 3000

// Vercel runs this file as a serverless function, so do not start a listener there.
// Keep the local dev experience working with `npm run dev`.
if (!process.env.VERCEL) {
  app.listen(PORT,()=>{
      console.log(`Server running at: http://localhost:${PORT}`)
  })
}

export default app;