import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { DataInitializerModule } from './data-initializer.module';

describe('EmailController (integration test)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, DataInitializerModule.forRoot()],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 201 when the email is valid', () => {
    return request(app.getHttpServer())
      .post('/v1/email/validate')
      .send({ email: 'test@mailinator.com' })
      .expect(201);
  });
});
