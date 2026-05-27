import { Controller, Delete, Get, Param, Patch, Post, Req, Res, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JwtGuard } from '../common/auth/jwt.guard';
import { multerImageOptions } from '../common/upload/image-upload';
import { ProjectsService } from './projects.service';

@Controller('project')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor('image', multerImageOptions))
  async createProject(@Req() req: Request, @UploadedFile() file?: Express.Multer.File, @Body() body: Record<string, string>) {
    if (!req.user?.id) {
      throw new BadRequestException('Unauthorized');
    }

    const tags = body.tags ? body.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [];

    return this.projectsService.createProject(req.user.id, {
      title: body.title,
      description: body.description,
      liveLink: body.liveLink,
      gitHubLink: body.gitHubLink,
      tags,
      image: file?.path,
    });
  }

  @Get('migration-status')
  getMigrationStatus() {
    return this.projectsService.getMigrationStatus();
  }

  @Get()
  async getAllProjects(@Req() req: Request) {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    return this.projectsService.getAllProjects(search);
  }

  @Get(':id')
  async getProjectById(@Param('id') id: string, @Req() req: Request) {
    const token = typeof req.query.token === 'string'
      ? req.query.token
      : req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : undefined;

    return this.projectsService.getProjectById(id, token);
  }

  @Get(':id/stream')
  async streamProjectEvents(@Param('id') id: string, @Res() res: Response) {
    const unsubscribe = await this.projectsService.streamProjectEvents(id, res);
    res.on('close', unsubscribe);
  }

  @Patch(':id/like')
  @UseGuards(JwtGuard)
  async toggleLike(@Param('id') id: string, @Req() req: Request) {
    if (!req.user?.id) {
      throw new BadRequestException('Unauthorized');
    }

    return this.projectsService.toggleLike(id, req.user.id);
  }

  @Post(':id/comments')
  @UseGuards(JwtGuard)
  async postComment(@Param('id') id: string, @Req() req: Request, @Body() body: { text: string }) {
    if (!req.user) {
      throw new BadRequestException('Unauthorized');
    }

    return this.projectsService.postComment(id, req.user, body.text);
  }

  @Patch(':projectId/comments/:commentId')
  @UseGuards(JwtGuard)
  async editComment(
    @Param('projectId') projectId: string,
    @Param('commentId') commentId: string,
    @Req() req: Request,
    @Body() body: { updatedText: string },
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('Unauthorized');
    }

    return this.projectsService.editComment(projectId, commentId, req.user.id, body.updatedText);
  }

  @Delete(':projectId/comments/:commentId')
  @UseGuards(JwtGuard)
  async deleteComment(
    @Param('projectId') projectId: string,
    @Param('commentId') commentId: string,
    @Req() req: Request,
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('Unauthorized');
    }

    return this.projectsService.deleteComment(projectId, commentId, req.user.id);
  }

  @Post(':projectId/comments/:commentId/reply')
  @UseGuards(JwtGuard)
  async replyComment(
    @Param('projectId') projectId: string,
    @Param('commentId') commentId: string,
    @Req() req: Request,
    @Body() body: { text: string },
  ) {
    if (!req.user) {
      throw new BadRequestException('Unauthorized');
    }

    return this.projectsService.replyComment(projectId, commentId, req.user, body.text);
  }

  @Patch(':projectId/comments/:commentId/reply/:replyId')
  @UseGuards(JwtGuard)
  async editReply(
    @Param('projectId') projectId: string,
    @Param('commentId') commentId: string,
    @Param('replyId') replyId: string,
    @Req() req: Request,
    @Body() body: { updatedText: string },
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('Unauthorized');
    }

    return this.projectsService.editReply(projectId, commentId, replyId, req.user.id, body.updatedText);
  }

  @Delete(':projectId/comments/:commentId/reply/:replyId')
  @UseGuards(JwtGuard)
  async deleteReply(
    @Param('projectId') projectId: string,
    @Param('commentId') commentId: string,
    @Param('replyId') replyId: string,
    @Req() req: Request,
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('Unauthorized');
    }

    return this.projectsService.deleteReply(projectId, commentId, replyId, req.user.id);
  }
}