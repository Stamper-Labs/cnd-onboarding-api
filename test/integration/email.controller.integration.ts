import * as request from 'supertest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { INestApplication } from '@nestjs/common';
import {
  CreateTableCommand,
  CreateTableCommandInput,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';

describe('EmailController (integration test)', () => {
  let app: INestApplication;
  let container: StartedTestContainer;

  beforeEach(async () => {
    container = await new GenericContainer('amazon/dynamodb-local')
      .withExposedPorts(8000)
      .start();

    const endpoint = `http://${container.getHost()}:${container.getMappedPort(8000)}`;
    process.env.DYNAMO_ENDPOINT = endpoint;

    const dynamoRegion = process.env.DYNAMO_REGION;
    const dynamoEndpoint = process.env.DYNAMO_ENDPOINT;
    const dynamoAccessKeyId = process.env.DYNAMO_ACCESS_KEY_ID;
    const dynamoSecretAccessKey = process.env.DYNAMO_SECRET_ACCESS_KEY;

    const client = new DynamoDBClient({
      region: dynamoRegion,
      endpoint: dynamoEndpoint,
      credentials: {
        accessKeyId: dynamoAccessKeyId || 'fake',
        secretAccessKey: dynamoSecretAccessKey || 'fake',
      },
    });

    const dynamoTableName =
      process.env.DYNAMO_TABLE_NAME || 'cnd-onboarding-api-tb-int-test';

    const tableParams: CreateTableCommandInput = {
      TableName: dynamoTableName,
      AttributeDefinitions: [
        { AttributeName: 'onboardingId', AttributeType: 'S' },
        { AttributeName: 'email', AttributeType: 'S' },
        { AttributeName: 'mobile', AttributeType: 'S' },
      ],
      KeySchema: [{ AttributeName: 'onboardingId', KeyType: 'HASH' }],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'email-index',
          KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
        },
        {
          IndexName: 'mobile-index',
          KeySchema: [{ AttributeName: 'mobile', KeyType: 'HASH' }],
          Projection: { ProjectionType: 'ALL' },
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    };

    const createTableCommand = new CreateTableCommand(tableParams);

    try {
      await client.send(createTableCommand);
      console.log('✅ DynamoDB test table created');
      // Create and init Nest app
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    } catch (err) {
      console.error(err);
    }
  });

  afterAll(async () => {
    await container.stop();
    await app.close();
  });

  it('should return 201 when the email is valid', () => {
    return request(app.getHttpServer())
      .post('/v1/email/validate')
      .send({ email: 'test@mailinator.com' })
      .expect(201);
  });
});
