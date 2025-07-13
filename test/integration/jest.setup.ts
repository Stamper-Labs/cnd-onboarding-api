// test/setup/jest.setup.integration.ts
import {
  DynamoDBClient,
  CreateTableCommand,
  CreateTableCommandInput,
} from '@aws-sdk/client-dynamodb';

export default async function globalSetup(): Promise<void> {
  console.log('🧪 Running global setup...');
  process.env.TEST_GLOBAL_VAR = 'initialized';
  setupEnvVatiables();
  const dynamoClient: DynamoDBClient = setupDynamoClient();
  await createTable(dynamoClient);
}

function setupEnvVatiables(): void {
  process.env.PORT = '5001';
  process.env.APP_NAME = 'CND-ONBOARDING-API';
  process.env.DYNAMO_REGION = 'us-east-1';
  process.env.DYNAMO_ENDPOINT = 'http://localhost:8000';
  process.env.DYNAMO_ACCESS_KEY_ID = 'fake';
  process.env.DYNAMO_SECRET_ACCESS_KEY = 'fake';
  process.env.LOG_LEVEL = 'debug';
}

function setupDynamoClient(): DynamoDBClient {
  const client = new DynamoDBClient({
    region: process.env.DYNAMO_REGION,
    endpoint: process.env.DYNAMO_ENDPOINT,
    credentials: {
      accessKeyId: process.env.DYNAMO_ACCESS_KEY_ID || 'fake',
      secretAccessKey: process.env.DYNAMO_SECRET_ACCESS_KEY || 'fake',
    },
  });
  return client;
}

async function createTable(client: DynamoDBClient): Promise<void> {
  const tableParams: CreateTableCommandInput = {
    TableName: 'cnd-onboarding-api-tb',
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

  try {
    await client.send(new CreateTableCommand(tableParams));
    console.log('✅ DynamoDB test table created');
  } catch (err) {
    console.error(err);
  }
}
