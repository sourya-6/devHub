import { Router } from 'express';
import { protectRoute } from '../middlewares/auth.middleware.js';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  streamUserNotifications,
} from '../controllers/notification.controller.js';

const router = Router();

router.get('/', protectRoute, getNotifications);
router.get('/stream', protectRoute, streamUserNotifications);
router.patch('/read-all', protectRoute, markAllNotificationsRead);
router.patch('/:id/read', protectRoute, markNotificationRead);

export default router;