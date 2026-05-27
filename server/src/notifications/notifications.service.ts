import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { NotificationType, User } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { SseService } from '../common/sse/sse.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sseService: SseService,
  ) {}

  getMigrationStatus() {
    return {
      message: 'Notifications module scaffolded. Next step is to port unread counts, mark-read flows, and SSE streams on Prisma.',
    };
  }

  async createNotification(params: {
    userId: string;
    actorId: string;
    projectId: string;
    type: 'comment' | 'reply';
    message: string;
    commentId?: string | null;
    replyId?: string | null;
  }) {
    if (!params.userId || params.userId === params.actorId) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        actorId: params.actorId,
        projectId: params.projectId,
        type: params.type as NotificationType,
        message: params.message,
        commentId: params.commentId ?? null,
        replyId: params.replyId ?? null,
      },
      include: this.includeNotification(),
    });

    this.sseService.publish(`user:${params.userId}`, {
      event: 'notification:created',
      data: {
        notification: this.mapNotification(notification),
      },
    });

    return this.mapNotification(notification);
  }

  async getNotifications(userId: string) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: this.includeNotification(),
      }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      notifications: notifications.map((notification) => this.mapNotification(notification)),
      unreadCount,
    };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
      include: this.includeNotification(),
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
      include: this.includeNotification(),
    });

    return { notification: this.mapNotification(updated) };
  }

  async markAllNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { message: 'Notifications marked as read' };
  }

  async streamUserNotifications(userId: string, response: import('express').Response) {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    response.write(`: connected to user ${userId}\n\n`);

    const unsubscribe = this.sseService.subscribe(`user:${userId}`, (payload) => {
      const eventName = (payload as { event?: string })?.event ?? 'message';
      const data = (payload as { data?: unknown })?.data ?? payload;
      response.write(`event: ${eventName}\n`);
      response.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    return unsubscribe;
  }

  private includeNotification() {
    return {
      actor: {
        select: { id: true, name: true, username: true, avatar: true },
      },
      project: {
        select: { id: true, title: true, image: true },
      },
    };
  }

  private mapNotification(notification: any) {
    return {
      id: notification.id,
      userId: notification.userId,
      actorId: notification.actorId,
      projectId: notification.projectId,
      type: notification.type,
      message: notification.message,
      read: notification.read,
      commentId: notification.commentId,
      replyId: notification.replyId,
      actor: notification.actor ? { id: notification.actor.id, name: notification.actor.name, username: notification.actor.username, avatar: notification.actor.avatar } : null,
      project: notification.project ? { id: notification.project.id, title: notification.project.title, image: notification.project.image } : null,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}