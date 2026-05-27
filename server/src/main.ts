import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:4200';

  app.use(cookieParser());
  app.use(
    cors({
      origin: clientOrigin,
      credentials: true,
    }),
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('DevHub API')
    .setDescription('API documentation for DevHub projects, auth, and notifications.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Server running at: http://localhost:${port}`);
  console.log(`Swagger docs running at: http://localhost:${port}/docs`);
}

void bootstrap();
