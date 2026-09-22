import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    super({ adapter: new PrismaPg({ connectionString: url }) });
  }
  async onModuleInit() {
    if (process.env.NODE_ENV !== 'test') await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
