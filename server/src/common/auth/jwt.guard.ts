import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

interface JwtPayload {
  id: string;
}

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Not authorized, no token');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('JWT secret is missing');
    }

    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      const user = await this.prisma.user.findUnique({ where: { id: decoded.id } });

      if (!user) {
        throw new UnauthorizedException('User Not Found');
      }

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid Token!!');
    }
  }

  private extractToken(request: Request) {
    const authorization = request.headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
      return authorization.split(' ')[1];
    }

    if (request.cookies?.token) {
      return request.cookies.token;
    }

    if (typeof request.query.token === 'string') {
      return request.query.token;
    }

    return undefined;
  }
}