import { Module, DynamicModule, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

@Module({})
export class DynamoModule {
  static forRoot(): DynamicModule {
    const dynamoProvider: Provider = {
      provide: 'DYNAMO_CLIENT',
      useFactory: (logger: Logger, configService: ConfigService) => {
        const dynamoRegion = configService.get<string>('DYNAMO_REGION');
        const dynamoEndpoint = configService.get<string>('DYNAMO_ENDPOINT');
        const dynamoAccessKeyId = configService.get<string>(
          'DYNAMO_ACCESS_KEY_ID',
        );
        const dynamoSecretAccessKey = configService.get<string>(
          'DYNAMO_SECRET_ACCESS_KEY',
        );

        if (!dynamoRegion) {
          logger.error('DYNAMO_REGION is not set in environment variables!');
          throw new Error(
            'DYNAMO_REGION is required for DynamoDB configuration',
          );
        }

        const dynamoClientConfig: DynamoDBClientConfig = {
          region: dynamoRegion,
        };

        if (dynamoEndpoint) {
          dynamoClientConfig.endpoint = dynamoEndpoint;
          if (!dynamoAccessKeyId || !dynamoSecretAccessKey) {
            logger.error(
              'DYNAMO_ACCESS_KEY_ID or DYNAMO_SECRET_ACCESS_KEY is not set in environment variables!',
            );
            throw new Error(
              'Both DYNAMO_ACCESS_KEY_ID and DYNAMO_SECRET_ACCESS_KEY are required when DYNAMO_ENDPOINT is set',
            );
          }
          dynamoClientConfig.credentials = {
            accessKeyId: dynamoAccessKeyId,
            secretAccessKey: dynamoSecretAccessKey,
          };
        }

        const ddbClient = new DynamoDBClient(dynamoClientConfig);
        return DynamoDBDocumentClient.from(ddbClient);
      },
      inject: [Logger, ConfigService],
    };

    return {
      module: DynamoModule,
      providers: [dynamoProvider],
      exports: [dynamoProvider],
    };
  }
}
