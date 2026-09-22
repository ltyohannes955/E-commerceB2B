/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { CSRF_COOKIE } from './auth.service';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
    const cookie = req.cookies?.[CSRF_COOKIE];
    const header = req.header('x-csrf-token');
    const secret = process.env.AUTH_CSRF_SECRET;
    if (!cookie || !header || !secret)
      throw new ForbiddenException({
        code: 'CSRF_REQUIRED',
        detail: 'A valid CSRF token is required.',
      });
    const expected = createHmac('sha256', secret).update(cookie).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(header);
    if (a.length !== b.length || !timingSafeEqual(a, b))
      throw new ForbiddenException({
        code: 'CSRF_INVALID',
        detail: 'A valid CSRF token is required.',
      });
    return true;
  }
}
