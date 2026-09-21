import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { parsePort } from './config/port';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(parsePort(process.env.PORT));
}
void bootstrap();
