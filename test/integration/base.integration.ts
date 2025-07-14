import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import {
  CreateTableCommand,
  CreateTableCommandInput,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';

export class BaseIntegrationTest {
  protected app: INestApplication;
  protected container: StartedTestContainer;

  async setup(): Promise<void> {
    // Start DynamoDB container
    this.container = await new GenericContainer('amazon/dynamodb-local')
      .withExposedPorts(8000)
      .start();

    const endpoint = `http://${this.container.getHost()}:${this.container.getMappedPort(8000)}`;
    process.env.DYNAMO_ENDPOINT = endpoint;

    const client: DynamoDBClient = this.setupDynamoClient();
    const dynamoTableName =
      process.env.DYNAMO_TABLE_NAME || 'cnd-onboarding-api-tb-int-test';
    const createTableCommand: CreateTableCommand =
      this.buildCreateTableCommand(dynamoTableName);

    try {
      await client.send(createTableCommand);
      console.log('✅ DynamoDB test table created');
    } catch (err) {
      console.error(err);
    }

    // Create and init Nest app
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    await this.app.init();
  }

  async teardown(): Promise<void> {
    if (this.app) await this.app.close();
    if (this.container) await this.container.stop();
  }

  getHttpServer(): ReturnType<INestApplication['getHttpServer']> {
    return this.app.getHttpServer();
  }

  private setupDynamoClient(): DynamoDBClient {
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

    return client;
  }

  private buildCreateTableCommand(tableName: string): CreateTableCommand {
    const tableParams: CreateTableCommandInput = {
      TableName: tableName,
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
    return new CreateTableCommand(tableParams);
  }
}
