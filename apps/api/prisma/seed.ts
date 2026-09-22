import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME?.trim();
  if (!email || !password || !fullName)
    throw new Error(
      'ADMIN_EMAIL, ADMIN_PASSWORD and ADMIN_FULL_NAME are required',
    );
  if (password.length < 8)
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== 'ADMIN')
    throw new Error('ADMIN_EMAIL belongs to a customer; refusing promotion');
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.user.upsert({
    where: { email },
    update: { fullName },
    create: {
      email,
      fullName,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      legalVersion: 'phase1-draft',
    },
  });
  console.log(`Admin seed ensured for ${email}`);
}
main().finally(() => prisma.$disconnect());
