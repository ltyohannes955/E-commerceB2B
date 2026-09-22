/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService, normalizeEmail, safeUser } from '../auth/auth.service';
import { AccessGuard } from '../auth/auth.guard';
import type { AuthRequest } from '../auth/auth.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import { ChangePasswordDto, UpdateProfileDto } from '../auth/auth.dto';

@Controller('users')
@UseGuards(AccessGuard, CsrfGuard)
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}
  @Get('me') me(@Req() req: AuthRequest) {
    return safeUser(req.user);
  }
  @Patch('me')
  async update(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto) {
    const data: any = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone || null;
    if (
      dto.email !== undefined &&
      normalizeEmail(dto.email) !== req.user.email
    ) {
      if (
        !dto.currentPassword ||
        !(await this.auth.verifyPassword(
          req.user.passwordHash,
          dto.currentPassword,
        ))
      )
        throw new Error('CURRENT_PASSWORD_REQUIRED');
      data.email = normalizeEmail(dto.email);
    }
    const updated = await this.prisma.user.update({
      where: { id: req.user.id },
      data,
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        targetUserId: req.user.id,
        action: 'PROFILE_UPDATED',
        metadata: { fields: Object.keys(data) },
      },
    });
    return safeUser(updated);
  }
  @Patch('me/password')
  async changePassword(
    @Req() req: AuthRequest,
    @Body() dto: ChangePasswordDto,
    @Req() request: Request,
  ) {
    if (
      !(await this.auth.verifyPassword(
        req.user.passwordHash,
        dto.currentPassword,
      ))
    )
      throw new Error('CURRENT_PASSWORD_INVALID');
    const hash = await this.auth.hashPassword(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: req.user.id },
        data: { passwordHash: hash },
      }),
      this.prisma.session.updateMany({
        where: { userId: req.user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: req.user.id,
          targetUserId: req.user.id,
          action: 'PASSWORD_CHANGED',
          ipAddress: request.ip,
        },
      }),
    ]);
    return { message: 'Password changed. Please sign in again.' };
  }
}
