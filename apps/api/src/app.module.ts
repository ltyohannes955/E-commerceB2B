/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { HealthService } from './common/health.service';
import { CatalogModule } from './catalog/catalog.module';
for (const envPath of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env'),
  resolve(process.cwd(), 'apps/api/.env'),
]) {
  try {
    loadEnvFile(envPath);
  } catch {
    // Optional local environment files are loaded when present.
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => {
        if (
          env.NODE_ENV === 'production' &&
          (!env.AUTH_ACCESS_SECRET || !env.AUTH_CSRF_SECRET)
        ) {
          throw new Error(
            'AUTH_ACCESS_SECRET and AUTH_CSRF_SECRET are required in production',
          );
        }
        return {
          ...env,
          DATABASE_URL:
            env.DATABASE_URL ??
            'postgresql://commerce:commerce_dev_password@localhost:5432/ecommerce?schema=public',
          AUTH_ACCESS_SECRET:
            env.AUTH_ACCESS_SECRET ??
            'phase1-development-access-secret-please-change',
          AUTH_CSRF_SECRET:
            env.AUTH_CSRF_SECRET ??
            'phase1-development-csrf-secret-please-change',
          WEB_ORIGIN: env.WEB_ORIGIN ?? 'http://localhost:3000',
        };
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    CatalogModule,
  ],
  controllers: [AppController],
  providers: [AppService, HealthService],
})
export class AppModule {}
