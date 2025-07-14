import {
  CreateTableCommand,
  CreateTableCommandInput,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { DynamicModule, Module, OnModuleInit, Provider } from '@nestjs/common';
import { GenericContainer } from 'testcontainers';

@Module({})
export class IntegrationTestModule implements OnModuleInit {
  private static readonly DYNAMO_TEST_CONTAINER_IMAGE = 'amazon/dynamodb-local';

  constructor(private readonly client: DynamoDBClient) {}

  async onModuleInit() {
    const tableParams: CreateTableCommandInput = {
      TableName:
        process.env.DYNAMO_TABLE_NAME || 'cnd-onboarding-api-tb-int-test',
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

    await this.client.send(new CreateTableCommand(tableParams));
    console.log('✅ DynamoDB test table created');
  }

  static async forRoot(): Promise<DynamicModule> {
    const container = await new GenericContainer(
      IntegrationTestModule.DYNAMO_TEST_CONTAINER_IMAGE,
    )
      .withExposedPorts(8000)
      .start();

    const endpoint = `http://${container.getHost()}:${container.getMappedPort(8000)}`;
    process.env.DYNAMO_ENDPOINT = endpoint;

    const dynamoClient = new DynamoDBClient({
      region: process.env.DYNAMO_REGION,
      endpoint: process.env.DYNAMO_ENDPOINT,
      credentials: {
        accessKeyId: process.env.DYNAMO_ACCESS_KEY_ID || 'fake',
        secretAccessKey: process.env.DYNAMO_SECRET_ACCESS_KEY || 'fake',
      },
    });

    const containerProvider: Provider = {
      provide: 'DYNAMO_CONTAINER',
      useValue: container,
    };

    const dynamoClientProvider: Provider = {
      provide: DynamoDBClient,
      useValue: dynamoClient,
    };

    return {
      module: IntegrationTestModule,
      providers: [containerProvider, dynamoClientProvider],
      exports: [containerProvider, dynamoClientProvider],
    };
  }
}
