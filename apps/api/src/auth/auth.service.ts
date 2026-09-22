/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'node:crypto';
import argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

export const ACCESS_COOKIE = 'b2b_access';
export const REFRESH_COOKIE = 'b2b_refresh';
export const CSRF_COOKIE = 'b2b_csrf';

export type SafeUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: 'CUSTOMER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  lastLoginAt: Date | null;
  createdAt: Date;
};

export function safeUser(user: any): SafeUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}
  async hashPassword(password: string) {
    return argon2.hash(password, { type: argon2.argon2id });
  }
  async verifyPassword(hash: string, password: string) {
    return argon2.verify(hash, password);
  }
  accessSecret() {
    return this.config.getOrThrow<string>('AUTH_ACCESS_SECRET');
  }
  newOpaqueToken() {
    return randomBytes(32).toString('base64url');
  }
  async revokeSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
