/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { createHmac, randomUUID } from 'node:crypto';
import {
  AuthService,
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  hashToken,
  normalizeEmail,
  safeUser,
} from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './auth.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CsrfGuard } from './csrf.guard';

@Controller('auth')
@UseGuards(CsrfGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  private cookieOptions(maxAge: number, httpOnly = true) {
    return {
      httpOnly,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge,
    };
  }
  private csrf(response: Response) {
    const raw = this.auth.newOpaqueToken();
    const token = createHmac(
      'sha256',
      this.config.getOrThrow<string>('AUTH_CSRF_SECRET'),
    )
      .update(raw)
      .digest('hex');
    response.cookie(CSRF_COOKIE, raw, this.cookieOptions(86_400_000, false));
    return token;
  }
  private async issue(user: any, req: Request, response: Response) {
    const access = await this.jwt.signAsync(
      { sub: user.id, role: user.role },
      { secret: this.auth.accessSecret(), expiresIn: '15m' },
    );
    const refreshSecret = this.auth.newOpaqueToken();
    const familyId = randomUUID();
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshSecret),
        familyId,
        expiresAt: new Date(Date.now() + 30 * 86_400_000),
        userAgent: req.get('user-agent')?.slice(0, 512),
        ipAddress: req.ip,
      },
    });
    response.cookie(ACCESS_COOKIE, access, this.cookieOptions(15 * 60_000));
    response.cookie(
      REFRESH_COOKIE,
      `${session.id}.${refreshSecret}`,
      this.cookieOptions(30 * 86_400_000),
    );
    return safeUser(user);
  }
  @Get('csrf') @HttpCode(HttpStatus.OK) getCsrf(
    @Res({ passthrough: true }) response: Response,
  ) {
    return { csrfToken: this.csrf(response) };
  }
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (!dto.termsAccepted || !dto.privacyAccepted)
      throw new BadRequestException({
        code: 'LEGAL_ACCEPTANCE_REQUIRED',
        detail: 'Terms and Privacy acceptance are required.',
      });
    const email = normalizeEmail(dto.email);
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists)
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        detail: 'An account with this email already exists.',
      });
    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        phone: dto.phone,
        passwordHash: await this.auth.hashPassword(dto.password),
        termsAcceptedAt: now,
        privacyAcceptedAt: now,
        legalVersion: this.config.get('LEGAL_VERSION', 'phase1-draft'),
      },
    });
    await this.prisma.auditLog.create({
      data: {
        targetUserId: user.id,
        action: 'USER_REGISTERED',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 512),
      },
    });
    return this.issue(user, req, response);
  }
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });
    if (
      !user ||
      !(await this.auth.verifyPassword(user.passwordHash, dto.password))
    )
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        detail: 'Email or password is incorrect.',
      });
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        detail: 'Email or password is incorrect.',
      });
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        targetUserId: user.id,
        action: 'LOGIN_SUCCESS',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')?.slice(0, 512),
      },
    });
    return this.issue(updated, req, response);
  }
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!raw)
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        detail: 'Authentication is required.',
      });
    const [sessionId, secret] = raw.split('.');
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });
    if (!session || session.tokenHash !== hashToken(secret ?? ''))
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        detail: 'Authentication is required.',
      });
    if (session.revokedAt) {
      await this.prisma.session.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({
        code: 'REFRESH_REUSE_DETECTED',
        detail: 'Authentication is required.',
      });
    }
    if (session.expiresAt <= new Date() || session.user.status !== 'ACTIVE')
      throw new UnauthorizedException({
        code: 'AUTH_REQUIRED',
        detail: 'Authentication is required.',
      });
    const nextSecret = this.auth.newOpaqueToken();
    const next = await this.prisma.session.create({
      data: {
        userId: session.userId,
        tokenHash: hashToken(nextSecret),
        familyId: session.familyId,
        expiresAt: session.expiresAt,
        userAgent: req.get('user-agent')?.slice(0, 512),
        ipAddress: req.ip,
      },
    });
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        replacedBySessionId: next.id,
        lastUsedAt: new Date(),
      },
    });
    const access = await this.jwt.signAsync(
      { sub: session.user.id, role: session.user.role },
      { secret: this.auth.accessSecret(), expiresIn: '15m' },
    );
    response.cookie(ACCESS_COOKIE, access, this.cookieOptions(15 * 60_000));
    response.cookie(
      REFRESH_COOKIE,
      `${next.id}.${nextSecret}`,
      this.cookieOptions(30 * 86_400_000),
    );
    return safeUser(session.user);
  }
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (raw) {
      const [id] = raw.split('.');
      if (id)
        await this.prisma.session.updateMany({
          where: { id },
          data: { revokedAt: new Date() },
        });
    }
    response.clearCookie(ACCESS_COOKIE, { path: '/' });
    response.clearCookie(REFRESH_COOKIE, { path: '/' });
    response.clearCookie(CSRF_COOKIE, { path: '/' });
  }
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgot(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });
    if (user && this.config.get('RESET_DELIVERY_ENABLED', 'false') === 'true') {
      const token = this.auth.newOpaqueToken();
      await this.prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
      });
      console.info(
        `[development] password reset URL: ${this.config.get('WEB_ORIGIN', 'http://localhost:3000')}/reset-password?token=${token}`,
      );
    }
    await this.prisma.auditLog
      .create({
        data: {
          targetUserId: user?.id,
          action: 'PASSWORD_RESET_REQUESTED',
          ipAddress: req.ip,
        },
      })
      .catch(() => undefined);
    return {
      message: 'If an account exists, reset instructions will be sent.',
    };
  }
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reset(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: hashToken(dto.token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record)
      throw new BadRequestException({
        code: 'RESET_TOKEN_INVALID',
        detail: 'This reset link is invalid or expired.',
      });
    const hash = await this.auth.hashPassword(dto.password);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: hash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    response.clearCookie(ACCESS_COOKIE, { path: '/' });
    response.clearCookie(REFRESH_COOKIE, { path: '/' });
  }
}
