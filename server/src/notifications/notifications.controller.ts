import { Controller, Get, Param, Patch, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtGuard } from '../common/auth/jwt.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtGuard)
  async getNotifications(@Req() req: Request) {
    return this.notificationsService.getNotifications(req.user!.id);
  }

  @Get('stream')
  @UseGuards(JwtGuard)
  async streamUserNotifications(@Req() req: Request, @Res() res: Response) {
    const unsubscribe = await this.notificationsService.streamUserNotifications(req.user!.id, res);
    res.on('close', unsubscribe);
  }

  @Patch('read-all')
  @UseGuards(JwtGuard)
  async markAllNotificationsRead(@Req() req: Request) {
    return this.notificationsService.markAllNotificationsRead(req.user!.id);
  }

  @Patch(':id/read')
  @UseGuards(JwtGuard)
  async markNotificationRead(@Param('id') id: string, @Req() req: Request) {
    return this.notificationsService.markNotificationRead(req.user!.id, id);
  }

  @Get('migration-status')
  getMigrationStatus() {
    return this.notificationsService.getMigrationStatus();
  }
}