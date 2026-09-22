import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}
  async check() {
    if (process.env.NODE_ENV === 'test')
      return {
        status: 'ok' as const,
        service: 'api' as const,
        database: 'test' as const,
      };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok' as const,
        service: 'api' as const,
        database: 'ok' as const,
      };
    } catch {
      return {
        status: 'error' as const,
        service: 'api' as const,
        database: 'unavailable' as const,
      };
    }
  }
}
