import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Project, ProjectComment, ProjectReply, User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../common/prisma/prisma.service';
import { SseService } from '../common/sse/sse.service';
import { NotificationsService } from '../notifications/notifications.service';

type ProjectWithRelations = Project & {
  owner: User;
  comments: (ProjectComment & {
    user: User;
    replies: (ProjectReply & { user: User })[];
  })[];
  likes: { userId: string }[];
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly sseService: SseService,
    private readonly configService: ConfigService,
  ) {}

  getMigrationStatus() {
    return {
      message: 'Projects module scaffolded. Next step is to port likes, comments, replies, and SSE on Prisma tables.',
    };
  }

  async createProject(userId: string, payload: {
    title: string;
    description: string;
    liveLink?: string;
    gitHubLink?: string;
    tags?: string[];
    image?: string;
  }) {
    if (!payload.title?.trim() || !payload.description?.trim()) {
      throw new BadRequestException('Title and description required');
    }

    const project = await this.prisma.project.create({
      data: {
        title: payload.title.trim(),
        description: payload.description.trim(),
        liveLink: payload.liveLink?.trim() ?? '',
        gitHubLink: payload.gitHubLink?.trim() ?? '',
        tags: payload.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [],
        image: payload.image ?? '',
        ownerId: userId,
      },
      include: this.projectInclude(),
    });

    return { message: 'Project Created Successfully', project: this.mapProject(project) };
  }

  async getAllProjects(search?: string) {
    const normalizedSearch = search?.trim();

    const projects = await this.prisma.project.findMany({
      where: normalizedSearch
        ? {
            OR: [
              { title: { contains: normalizedSearch, mode: 'insensitive' } },
              { description: { contains: normalizedSearch, mode: 'insensitive' } },
              { liveLink: { contains: normalizedSearch, mode: 'insensitive' } },
              { gitHubLink: { contains: normalizedSearch, mode: 'insensitive' } },
              { tags: { has: normalizedSearch } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
        comments: { include: { user: true, replies: { include: { user: true } }, }, orderBy: { createdAt: 'asc' } },
        likes: true,
      },
    });

    return {
      count: projects.length,
      projects: projects.map((project) => this.mapProjectSummary(project as ProjectWithRelations)),
    };
  }

  async getProjectById(projectId: string, token?: string) {
    if (!projectId || !this.isUuid(projectId)) {
      throw new NotFoundException('Invalid Project ID');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: this.projectInclude(),
    });

    if (!project) {
      throw new NotFoundException('Project Not Found!!');
    }

    const currentUserId = token ? this.getUserIdFromToken(token) : undefined;
    const likeCount = project.likes.length;
    const likedByMe = currentUserId ? project.likes.some((like) => like.userId === currentUserId) : false;

    return {
      project: {
        ...this.mapProject(project as ProjectWithRelations),
        likedByMe,
        likeCount,
      },
    };
  }

  async toggleLike(projectId: string, userId: string) {
    if (!this.isUuid(projectId)) {
      throw new BadRequestException('Invalid Project Id');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { likes: true },
    });

    if (!project) {
      throw new NotFoundException('Project not Found!!');
    }

    const existingLike = project.likes.find((like) => like.userId === userId);
    let likedByMe = false;

    await this.prisma.$transaction(async (tx) => {
      if (existingLike) {
        await tx.projectLike.delete({
          where: {
            userId_projectId: {
              userId,
              projectId,
            },
          },
        });
        likedByMe = false;
      } else {
        await tx.projectLike.create({
          data: {
            userId,
            projectId,
          },
        });
        likedByMe = true;
      }

      await tx.project.update({
        where: { id: projectId },
        data: {
          likeCount: {
            increment: existingLike ? -1 : 1,
          },
        },
      });
    });

    const updatedProject = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { likes: true },
    });

    const likeCount = updatedProject?.likes.length ?? 0;
    this.sseService.publish(`project:${projectId}`, {
      event: 'project:likes-updated',
      data: {
        projectId,
        likeCount,
      },
    });

    return {
      message: likedByMe ? 'Liked Project' : 'Unliked Project',
      likeCount,
      likedByMe,
    };
  }

  async postComment(projectId: string, user: User, text: string) {
    const cleanedText = text?.trim();
    if (!cleanedText) {
      throw new BadRequestException('No text Found');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { comments: true },
    });

    if (!project) {
      throw new NotFoundException('No project with given ID');
    }

    const createdComment = await this.prisma.projectComment.create({
      data: {
        userId: user.id,
        projectId,
        text: cleanedText,
      },
      include: { user: true, replies: { include: { user: true } } },
    });

    const comments = await this.getComments(projectId);
    this.sseService.publish(`project:${projectId}`, {
      event: 'project:comments-updated',
      data: {
        projectId,
        comments,
      },
    });

    await this.notificationsService.createNotification({
      userId: project.ownerId,
      actorId: user.id,
      projectId,
      type: 'comment',
      message: `${user.name} commented on "${project.title}": "${this.getNotificationPreview(cleanedText)}"`,
      commentId: createdComment.id,
    });

    return {
      message: 'Comment Added Successfully',
      comments,
    };
  }

  async editComment(projectId: string, commentId: string, userId: string, updatedText: string) {
    const comment = await this.prisma.projectComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.projectId !== projectId) {
      throw new NotFoundException('Comment Not Found');
    }

    if (comment.userId !== userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    const updated = await this.prisma.projectComment.update({
      where: { id: commentId },
      data: { text: updatedText },
      include: { user: true, replies: { include: { user: true } } },
    });

    return {
      message: 'Comment Edited Successfully',
      comment: updated,
    };
  }

  async deleteComment(projectId: string, commentId: string, userId: string) {
    const comment = await this.prisma.projectComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.projectId !== projectId) {
      throw new NotFoundException('Comment Not Found!!');
    }

    if (comment.userId !== userId) {
      throw new UnauthorizedException('Unauthorized Access');
    }

    await this.prisma.projectComment.delete({ where: { id: commentId } });
    const comments = await this.getComments(projectId);

    return {
      message: 'Comment Deleted Successfully',
      comments,
    };
  }

  async replyComment(projectId: string, commentId: string, user: User, text: string) {
    const cleanedText = text?.trim();
    if (!cleanedText) {
      throw new BadRequestException('Reply Text required');
    }

    const comment = await this.prisma.projectComment.findUnique({ where: { id: commentId }, include: { user: true } });
    if (!comment || comment.projectId !== projectId) {
      throw new NotFoundException('Comment Not Found!!');
    }

    const createdReply = await this.prisma.projectReply.create({
      data: {
        commentId,
        userId: user.id,
        text: cleanedText,
      },
      include: { user: true },
    });

    const comments = await this.getComments(projectId);
    this.sseService.publish(`project:${projectId}`, {
      event: 'project:comments-updated',
      data: { projectId, comments },
    });
    this.sseService.publish(`project:${projectId}`, {
      event: 'project:replies-updated',
      data: { projectId, commentId, comments },
    });

    if (comment.userId) {
      await this.notificationsService.createNotification({
        userId: comment.userId,
        actorId: user.id,
        projectId,
        type: 'reply',
        message: `${user.name} replied to your comment on "${(await this.prisma.project.findUnique({ where: { id: projectId } }))?.title ?? 'project'}": "${this.getNotificationPreview(cleanedText)}"`,
        commentId,
        replyId: createdReply.id,
      });
    }

    return {
      message: 'Reply Added',
      comment: comments.find((entry) => entry.id === commentId) ?? null,
    };
  }

  async editReply(projectId: string, commentId: string, replyId: string, userId: string, updatedText: string) {
    const reply = await this.prisma.projectReply.findUnique({ where: { id: replyId }, include: { comment: true } });
    if (!reply || reply.commentId !== commentId || reply.comment.projectId !== projectId) {
      throw new NotFoundException('Reply Not Found');
    }

    if (reply.userId !== userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.prisma.projectReply.update({
      where: { id: replyId },
      data: { text: updatedText },
    });

    const comments = await this.getComments(projectId);
    this.sseService.publish(`project:${projectId}`, {
      event: 'project:comments-updated',
      data: { projectId, comments },
    });
    this.sseService.publish(`project:${projectId}`, {
      event: 'project:replies-updated',
      data: { projectId, commentId, comments },
    });

    return {
      message: 'Reply Edited Successfully',
      comment: comments.find((entry) => entry.id === commentId) ?? null,
    };
  }

  async deleteReply(projectId: string, commentId: string, replyId: string, userId: string) {
    const reply = await this.prisma.projectReply.findUnique({ where: { id: replyId }, include: { comment: true } });
    if (!reply || reply.commentId !== commentId || reply.comment.projectId !== projectId) {
      throw new NotFoundException('Reply Not Found');
    }

    if (reply.userId !== userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.prisma.projectReply.delete({ where: { id: replyId } });

    const comments = await this.getComments(projectId);
    this.sseService.publish(`project:${projectId}`, {
      event: 'project:comments-updated',
      data: { projectId, comments },
    });
    this.sseService.publish(`project:${projectId}`, {
      event: 'project:replies-updated',
      data: { projectId, commentId, comments },
    });

    return {
      message: 'Reply Deleted Successfully',
      comment: comments.find((entry) => entry.id === commentId) ?? null,
    };
  }

  async streamProjectEvents(projectId: string, response: import('express').Response) {
    if (!this.isUuid(projectId)) {
      throw new BadRequestException('Invalid Project ID');
    }

    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    response.write(`: connected to project ${projectId}\n\n`);

    const unsubscribe = this.sseService.subscribe(`project:${projectId}`, (payload) => {
      const eventName = (payload as { event?: string })?.event ?? 'message';
      const data = (payload as { data?: unknown })?.data ?? payload;
      response.write(`event: ${eventName}\n`);
      response.write(`data: ${JSON.stringify(data)}\n\n`);
    });

    return unsubscribe;
  }

  private projectInclude() {
    return {
      owner: true,
      comments: {
        orderBy: { createdAt: 'asc' as const },
        include: { user: true, replies: { orderBy: { createdAt: 'asc' as const }, include: { user: true } } },
      },
      likes: true,
    };
  }

  private mapProject(project: ProjectWithRelations) {
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      image: project.image,
      liveLink: project.liveLink,
      gitHubLink: project.gitHubLink,
      tags: project.tags,
      owner: {
        id: project.owner.id,
        name: project.owner.name,
        username: project.owner.username,
        avatar: project.owner.avatar,
      },
      likeCount: project.likes.length,
      likes: project.likes.map((like) => like.userId),
      comments: project.comments.map((comment) => ({
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt,
        user: comment.user
          ? {
              id: comment.user.id,
              name: comment.user.name,
              username: comment.user.username,
              avatar: comment.user.avatar,
            }
          : null,
        replies: comment.replies.map((reply) => ({
          id: reply.id,
          text: reply.text,
          createdAt: reply.createdAt,
          user: reply.user
            ? {
                id: reply.user.id,
                name: reply.user.name,
                username: reply.user.username,
                avatar: reply.user.avatar,
              }
            : null,
        })),
      })),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  private mapProjectSummary(project: ProjectWithRelations) {
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      image: project.image,
      liveLink: project.liveLink,
      gitHubLink: project.gitHubLink,
      tags: project.tags,
      likeCount: project.likes.length,
      createdAt: project.createdAt,
    };
  }

  private async getComments(projectId: string) {
    const comments = await this.prisma.projectComment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: { user: true, replies: { orderBy: { createdAt: 'asc' }, include: { user: true } } },
    });

    return comments.map((comment) => ({
      id: comment.id,
      text: comment.text,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        name: comment.user.name,
        username: comment.user.username,
        avatar: comment.user.avatar,
      },
      replies: comment.replies.map((reply) => ({
        id: reply.id,
        text: reply.text,
        createdAt: reply.createdAt,
        user: {
          id: reply.user.id,
          name: reply.user.name,
          username: reply.user.username,
          avatar: reply.user.avatar,
        },
      })),
    }));
  }

  private getNotificationPreview(value: string, maxLength = 80) {
    const normalized = value.replace(/\s+/g, ' ').trim();
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
  }

  private isUuid(value: string) {
    return /^[0-9a-fA-F-]{36}$/.test(value);
  }

  private getUserIdFromToken(token: string) {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      return undefined;
    }

    try {
      const decoded = jwt.verify(token, secret) as { id?: string };
      return decoded.id;
    } catch {
      return undefined;
    }
  }
}