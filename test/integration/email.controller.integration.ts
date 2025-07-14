import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { IntegrationTestModule } from './integration-test.module';
import { StartedTestContainer } from 'testcontainers';

describe('EmailController (integration test)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const integrationTestModule = await IntegrationTestModule.forRoot();
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [integrationTestModule, AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    const container = app.get<StartedTestContainer>('DYNAMO_CONTAINER');
    await container.stop();
    await app.close();
  });

  it('should return 201 when the email is valid', () => {
    return request(app.getHttpServer())
      .post('/v1/email/validate')
      .send({ email: 'test@mailinator.com' })
      .expect(201);
  });

  it('should return 201 when the email is valid', () => {
    return request(app.getHttpServer())
      .post('/v1/email/validate')
      .send({ email: 'test@mailinator.com' })
      .expect(201);
  });
});
