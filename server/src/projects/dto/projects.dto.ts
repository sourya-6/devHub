import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetProjectsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number to fetch.',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'Number of projects per page.',
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 12,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 10;

  @ApiPropertyOptional({
    description: 'Search projects by title, description, links, or tags.',
    example: 'angular',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class ProjectSummaryDto {
  @ApiProperty({ example: 'c0bb0d0c-6462-4a04-98da-8d4d03b77838' })
  id!: string;

  @ApiProperty({ example: 'DevHub' })
  title!: string;

  @ApiProperty({ example: 'A project hub for developers to share their work.' })
  description!: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/demo/project.png' })
  image?: string;

  @ApiPropertyOptional({ example: 'https://devhub.example.com' })
  liveLink?: string;

  @ApiPropertyOptional({ example: 'https://github.com/user/devhub' })
  gitHubLink?: string;

  @ApiProperty({ example: ['angular', 'nestjs'], type: [String] })
  tags!: string[];

  @ApiProperty({ example: 4 })
  likeCount!: number;

  @ApiProperty({ example: '2026-05-27T07:30:00.000Z' })
  createdAt!: Date;
}

export class ProjectsPaginationDto {
  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 12 })
  limit!: number;

  @ApiProperty({ example: 4 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPrevPage!: boolean;
}

export class PaginatedProjectsResponseDto {
  @ApiProperty({ type: [ProjectSummaryDto] })
  data!: ProjectSummaryDto[];

  @ApiProperty({ type: ProjectsPaginationDto })
  pagination!: ProjectsPaginationDto;
}
