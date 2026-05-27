import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { uploadToCloudinary } from '../common/cloudinary/cloudinary';
import { PrismaService } from '../common/prisma/prisma.service';
import { GoogleAuthDto, LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';

type SafeUser = Pick<User, 'id' | 'name' | 'email' | 'username' | 'avatar' | 'bio' | 'skills'> & {
  githubLink: string;
  linkedinLink: string;
  websiteLink: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const name = dto.name.trim();
    const username = dto.username.trim().toLowerCase();
    const email = dto.email.trim().toLowerCase();
    const password = dto.password.trim();

    if (!name || !username || !email || !password) {
      throw new BadRequestException('All fields are mandatory');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        name,
        username,
        email,
        password: hashedPassword,
      },
    });

    return this.createAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email?.trim().toLowerCase();
    const username = dto.username?.trim().toLowerCase();
    const password = dto.password?.trim();

    if (!password) {
      throw new BadRequestException('Password Required');
    }

    if (!email && !username) {
      throw new BadRequestException('Invalid Credentials');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          username ? { username } : undefined,
        ].filter(Boolean) as Array<{ email?: string; username?: string }>,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid Credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BadRequestException('Invalid Credentials');
    }

    return this.createAuthResponse(user);
  }

  async googleAuth(dto: GoogleAuthDto) {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name?.trim() || email.split('@')[0];
    const avatar = dto.avatar?.trim() ?? '';

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    let user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      const baseUsername = email.split('@')[0];
      const password = await bcrypt.hash(crypto.randomUUID(), 10);

      let username = `${baseUsername}${Math.floor(Math.random() * 1000)}`.toLowerCase();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const existingUsername = await this.prisma.user.findUnique({ where: { username } });
        if (!existingUsername) {
          break;
        }

        username = `${baseUsername}${Math.floor(Math.random() * 100000)}`.toLowerCase();
      }

      user = await this.prisma.user.create({
        data: {
          email,
          name,
          avatar,
          username,
          password,
        },
      });
    }

    return this.createAuthResponse(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updateData: {
      bio?: string;
      skills?: string[];
      githubLink?: string;
      linkedinLink?: string;
      websiteLink?: string;
    } = {};

    if (dto.bio !== undefined) {
      updateData.bio = dto.bio;
    }

    if (dto.skills !== undefined) {
      updateData.skills = Array.isArray(dto.skills)
        ? dto.skills.map((skill) => skill.trim()).filter(Boolean)
        : String(dto.skills)
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean);
    }

    if (dto.links !== undefined) {
      const links = typeof dto.links === 'string' ? this.parseLinks(dto.links) : dto.links;
      updateData.githubLink = links.github?.trim() ?? '';
      updateData.linkedinLink = links.linkedin?.trim() ?? '';
      updateData.websiteLink = links.website?.trim() ?? '';
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return { user: this.sanitizeUser(user) };
  }

  async uploadAvatar(userId: string, filePath?: string) {
    if (!filePath) {
      throw new BadRequestException('Image file is required');
    }

    const uploadedImage = await uploadToCloudinary(filePath);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: uploadedImage.url },
    });

    return {
      message: 'Avatar Updated Successfully',
      user: this.sanitizeUser(user),
    };
  }

  logout() {
    return {
      message: 'Logout Successfully',
    };
  }

  private createAuthResponse(user: User) {
    const token = this.signToken(user.id);

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  private signToken(userId: string) {
    const secret = this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new BadRequestException('JWT secret is missing');
    }

    return jwt.sign({ id: userId }, secret, {
      expiresIn: '1d',
    });
  }

  private sanitizeUser(user: User): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      skills: user.skills,
      githubLink: user.githubLink,
      linkedinLink: user.linkedinLink,
      websiteLink: user.websiteLink,
    };
  }

  private parseLinks(value: string) {
    try {
      return JSON.parse(value) as {
        github?: string;
        linkedin?: string;
        website?: string;
      };
    } catch {
      return {};
    }
  }
}