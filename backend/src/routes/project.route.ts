import { Router } from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  createProject,
  getProjectById,
  streamProjectEvents,
  getAllProjects,
  toogleLikeProject,
  postComment,
  editComment,
  deleteComment,
  replyComment,
  editReply,
  deleteReply,
} from "../controllers/project.controller.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();

// 📦 Projects
router.post("/", protectRoute, upload.single("image"), createProject); // create
router.get("/", getAllProjects); // get all
router.get("/:id/stream", streamProjectEvents);
router.get("/:id", getProjectById); // get one

// ❤️ Likes
router.patch("/:id/like", protectRoute, toogleLikeProject);

// 💬 Comments
router.post("/:id/comments", protectRoute, postComment); // add comment
router.patch("/:projectId/comments/:commentId", protectRoute, editComment); // edit comment
router.delete("/:projectId/comments/:commentId", protectRoute, deleteComment); // delete comment

// 💬↪️ Replies
router.post("/:projectId/comments/:commentId/reply", protectRoute, replyComment);
router.patch("/:projectId/comments/:commentId/reply/:replyId", protectRoute, editReply); // edit reply
router.delete("/:projectId/comments/:commentId/reply/:replyId", protectRoute, deleteReply); // delete reply

export default router;