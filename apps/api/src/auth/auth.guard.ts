/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthService, ACCESS_COOKIE } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

export type AuthRequest = Request & { user?: any };
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.cookies?.[ACCESS_COOKIE];
    if (!token)
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        detail: 'Authentication is required.',
      });
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        sid: string;
        role: string;
      }>(token, { secret: this.auth.accessSecret() });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user || user.status !== 'ACTIVE')
        throw new ForbiddenException({
          code: 'ACCOUNT_SUSPENDED',
          detail: 'This account is not active.',
        });
      req.user = user;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        detail: 'Authentication is required.',
      });
    }
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    if (req.user?.role !== 'ADMIN')
      throw new ForbiddenException({
        code: 'ADMIN_REQUIRED',
        detail: 'Administrator access is required.',
      });
    return true;
  }
}
