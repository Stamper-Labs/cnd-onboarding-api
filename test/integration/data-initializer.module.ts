import {
  DynamoDBClient,
  CreateTableCommand,
  CreateTableCommandInput,
} from '@aws-sdk/client-dynamodb';
import { DynamicModule, Module, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Logger } from "nestjs-pino";

@Module({})
export class DataInitializerModule {
  static forRoot(): DynamicModule {
    const integrationTestProvider: Provider = {
      provide: 'DATA_INITIALIZER',
      inject: [Logger, ConfigService],
      useFactory: async (logger: Logger, configService: ConfigService) => {
        const client: DynamoDBClient = DataInitializerModule.setupDynamoClient(configService);
        const createTablecommandInput: CreateTableCommand = DataInitializerModule.buildCreateTableCommand();
        try {
          await client.send(createTablecommandInput);
          console.log('✅ DynamoDB test table created');
        } catch (err) {
          console.error(err);
        }
      }
    };
    return {
      module: DataInitializerModule,
      providers: [integrationTestProvider],
      exports: [integrationTestProvider]
    }
  }

  private static setupDynamoClient(configService: ConfigService): DynamoDBClient {
    const dynamoRegion = configService.get<string>('DYNAMO_REGION');
    const dynamoEndpoint = configService.get<string>('DYNAMO_ENDPOINT');
    const dynamoAccessKeyId = configService.get<string>('DYNAMO_ACCESS_KEY_ID');
    const dynamoSecretAccessKey = configService.get<string>('DYNAMO_SECRET_ACCESS_KEY');

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

  private static buildCreateTableCommand(): CreateTableCommand {
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
    return new CreateTableCommand(tableParams)
  }
}