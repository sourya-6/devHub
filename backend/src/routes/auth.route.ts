import { Router } from "express";
import { loginUser,registerUser,uploadAvatar, googleAuthUser, logoutUser, updateProfile } from "../controllers/user.controller.js";
import upload from "../middlewares/multer.middleware.js";
import { protectRoute } from "../middlewares/auth.middleware.js";
const router = Router();

router.post("/register",registerUser);
router.post('/google', googleAuthUser);
router.post("/login",loginUser)
router.patch('/avatar', protectRoute, upload.single('image'), uploadAvatar);
router.patch('/profile', protectRoute, updateProfile);

// Logout
router.post('/logout', protectRoute, logoutUser);

export default router;