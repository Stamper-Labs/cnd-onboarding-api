import * as request from 'supertest';
import { BaseIntegrationTest } from './base.integration';

describe('EmailController (integration test)', () => {
  const base = new BaseIntegrationTest();

  beforeEach(async () => {
    await base.setup();
  });

  afterAll(async () => {
    await base.teardown();
  });

  it('should return 201 when the email is valid', () => {
    return request(base.getApp().getHttpServer())
      .post('/v1/email/validate')
      .send({ email: 'test@mailinator.com' })
      .expect(201);
  });
});
