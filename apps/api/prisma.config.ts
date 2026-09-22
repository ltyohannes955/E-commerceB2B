import { loadEnvFile } from 'node:process';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

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
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://commerce:commerce_dev_password@localhost:5432/ecommerce?schema=public',
  },
});
