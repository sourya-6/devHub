import {
  BadRequestException,
  Body,
  Controller,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { JwtGuard } from '../common/auth/jwt.guard';
import { multerImageOptions } from '../common/upload/image-upload';
import { AuthService } from './auth.service';
import { GoogleAuthDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setAuthCookie(res, result.token);
    return result;
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setAuthCookie(res, result.token);
    return result;
  }

  @Post('google')
  async googleAuth(@Body() dto: GoogleAuthDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.googleAuth(dto);
    this.setAuthCookie(res, result.token);
    return result;
  }

  @Patch('avatar')
  @UseGuards(JwtGuard)
  @UseInterceptors(FileInterceptor('image', multerImageOptions))
  async uploadAvatar(@Req() req: Request, @UploadedFile() file?: Express.Multer.File) {
    if (!req.user?.id) {
      throw new BadRequestException('User not Found');
    }

    return this.authService.uploadAvatar(req.user.id, file?.path);
  }

  @Patch('profile')
  @UseGuards(JwtGuard)
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    if (!req.user?.id) {
      throw new BadRequestException('User not Found');
    }

    return this.authService.updateProfile(req.user.id, dto);
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return this.authService.logout();
  }

  private setAuthCookie(res: Response, token: string) {
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}