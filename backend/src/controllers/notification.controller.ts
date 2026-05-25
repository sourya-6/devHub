import type { Response, Request } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/notification.model.js';
import { subscribe } from '../sse/sse.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

const getNotifications = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: userId })
        .populate('actor', 'name username avatar')
        .populate('project', 'title image')
        .sort({ createdAt: -1 })
        .limit(20),
      Notification.countDocuments({ user: userId, read: false }),
    ]);

    return res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

const markNotificationRead = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?._id;
    const notificationId = req.params.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!notificationId || typeof notificationId !== 'string' || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification id' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true },
      { new: true }
    )
      .populate('actor', 'name username avatar')
      .populate('project', 'title image');

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    return res.status(200).json({ notification });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to update notification' });
  }
};

const markAllNotificationsRead = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await Notification.updateMany({ user: userId, read: false }, { read: true });

    return res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to update notifications' });
  }
};

const streamUserNotifications = (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?._id;

  if (!userId) {
    return res.status(401).end();
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(`: connected to user ${userId}\n\n`);

  const onPayload = (payload: any) => {
    const eventName = payload?.event ?? 'message';
    const data = payload?.data ?? payload;
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const unsubscribe = subscribe(`user:${userId}`, onPayload);

  req.on('close', () => {
    unsubscribe();
  });
};

export {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  streamUserNotifications,
};