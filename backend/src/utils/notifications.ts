import type mongoose from 'mongoose';
import { Notification } from '../models/notification.model.js';
import { publish } from '../sse/sse.js';

type NotificationType = 'comment' | 'reply';

interface CreateNotificationParams {
  userId: string | mongoose.Types.ObjectId;
  actorId: string | mongoose.Types.ObjectId;
  projectId: string | mongoose.Types.ObjectId;
  type: NotificationType;
  message: string;
  commentId?: string | mongoose.Types.ObjectId | null;
  replyId?: string | mongoose.Types.ObjectId | null;
}

export const createNotification = async ({
  userId,
  actorId,
  projectId,
  type,
  message,
  commentId = null,
  replyId = null,
}: CreateNotificationParams) => {
  const recipientId = userId.toString();
  const actor = actorId.toString();

  if (!recipientId || recipientId === actor) {
    return null;
  }

  const notification = await Notification.create({
    user: recipientId,
    actor,
    project: projectId,
    type,
    message,
    commentId,
    replyId,
  });

  const populatedNotification = await Notification.findById(notification._id)
    .populate('actor', 'name username avatar')
    .populate('project', 'title image')
    .lean();

  publish(`user:${recipientId}`, {
    event: 'notification:created',
    data: {
      notification: populatedNotification,
    },
  });

  return populatedNotification;
};