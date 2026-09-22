import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthService } from './common/health.service';

describe('AppController', () => {
  let appController: AppController;
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: HealthService,
          useValue: {
            check: jest.fn().mockResolvedValue({
              status: 'ok',
              service: 'api',
              database: 'test',
            }),
          },
        },
      ],
    }).compile();
    appController = app.get<AppController>(AppController);
  });
  it('returns the root example', () => {
    expect(appController.getHello()).toBe('Hello World!');
  });
  it('returns the API health payload', async () => {
    await expect(appController.getHealth()).resolves.toEqual({
      status: 'ok',
      service: 'api',
      database: 'test',
    });
  });
});
