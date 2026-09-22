/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['/'] });
    await app.init();
  });
  it('/ (GET)', () =>
    request(app.getHttpServer()).get('/').expect(200).expect('Hello World!'));
  it('/api/health (GET)', async () => {
    const result = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(result.body.service).toBe('api');
    expect(result.body.status).toBe('ok');
  });
  afterEach(async () => {
    await app.close();
  });
});
