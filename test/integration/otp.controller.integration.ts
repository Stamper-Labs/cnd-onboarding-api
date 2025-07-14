import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { IntegrationTestModule } from './integration-test.module';
import { StartedTestContainer } from 'testcontainers';

describe('OtpController (integration test)', () => {
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

  it('should return 412 when the email has not been validated', () => {
    return request(app.getHttpServer())
      .post('/v1/otp/send')
      .query({ channel: 'email' }) // 👈 query param ?destinationType=email
      .set('X-Onboarding-Id', 'abc-123')
      .send({ value: 'test@mailinator.com' })
      .expect(412);
  });
});
