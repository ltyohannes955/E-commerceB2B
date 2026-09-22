/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessGuard, AdminGuard } from '../auth/auth.guard';
import type { AuthRequest } from '../auth/auth.guard';
import { CsrfGuard } from '../auth/csrf.guard';
import { StatusDto } from '../auth/auth.dto';

@Controller('admin')
@UseGuards(AccessGuard, AdminGuard, CsrfGuard)
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('users') async users(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'SUSPENDED',
  ) {
    const p = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const where: any = { role: 'CUSTOMER' };
    if (status) where.status = status;
    if (search?.trim())
      where.OR = [
        {
          email: { contains: search.trim().toLowerCase(), mode: 'insensitive' },
        },
        { fullName: { contains: search.trim(), mode: 'insensitive' } },
      ];
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * size,
        take: size,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items: items.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        status: u.status,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
      page: p,
      pageSize: size,
      total,
      totalPages: Math.ceil(total / size),
    };
  }
  @Get('users/:id') user(@Param('id') id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        targetAuditLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
  }
  @Patch('users/:id/status') async status(
    @Param('id') id: string,
    @Body() dto: StatusDto,
    @Req() req: AuthRequest,
  ) {
    if (id === req.user.id) throw new Error('CANNOT_MODIFY_SELF');
    const target = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    if (target.role !== 'CUSTOMER') throw new Error('ADMIN_TARGET_NOT_ALLOWED');
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
    });
    if (dto.status === 'SUSPENDED')
      await this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: req.user.id,
        targetUserId: id,
        action:
          dto.status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
        metadata: { reason: dto.reason ?? null },
      },
    });
    return { id: updated.id, status: updated.status };
  }
  @Get('audit-logs') async audit(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('userId') userId?: string,
    @Query('action') action?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
    const where: any = {};
    if (userId) where.targetUserId = userId;
    if (action) where.action = action;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * size,
        take: size,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return {
      items,
      page: p,
      pageSize: size,
      total,
      totalPages: Math.ceil(total / size),
    };
  }
}
