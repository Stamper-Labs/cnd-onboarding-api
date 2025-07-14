import { Inject, Injectable } from '@nestjs/common';
import { InternalServerErrorException } from '@nestjs/common';
import { Onboarding } from '../entity/onboarding';
import { OnboardingCheckpoint } from '../entity/onboarding-checkpoint.enum';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { IndexCriteria } from './criteria/index.criteria';
import { PrimaryKeyCriteria } from './criteria/primary-key.criteria';
import { PatchCriteria } from './criteria/patch.criteria';
import { UpsertCriteria } from './criteria/upsert.criteria';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OnboardingRepository {
  private TABLE_NAME: string;

  constructor(
    @InjectPinoLogger(OnboardingRepository.name)
    private readonly logger: PinoLogger,
    @Inject('DYNAMO_CLIENT')
    private readonly dynamoClient: DynamoDBDocumentClient,
    private readonly configService: ConfigService,
  ) {
    const dynamoTableName = configService.get<string>('DYNAMO_TABLE_NAME');
    if (!dynamoTableName) {
      this.logger.error(
        {
          envValue: dynamoTableName,
          envKey: 'DYNAMO_TABLE_NAME',
          context: 'OnboardingRepository',
        },
        'Missing required environment variable: DYNAMO_TABLE_NAME',
      );

      throw new InternalServerErrorException(
        'Unexpected error while accessing onboarding table configuration. Please check service setup.',
      );
    } else {
      this.TABLE_NAME = dynamoTableName;
    }
  }

  async findOnboardingByIndex(
    indexCriteria: IndexCriteria,
  ): Promise<Onboarding | undefined> {
    this.logger.debug(`Find onboarding by index: ${indexCriteria.indexName}`);
    const queryCmd = this.buildQueryByIndexCmd(indexCriteria);
    return this.dynamoClient
      .send(queryCmd)
      .then((data) => {
        if (data.Items && data.Items.length > 0) {
          this.logger.debug(
            `Onboarding found by index: ${indexCriteria.indexName}`,
          );
          return Onboarding.builder()
            .setOnboardingId(data.Items[0].onboardingId)
            .setCheckpoint(
              OnboardingCheckpoint[
                data.Items[0].checkpoint as keyof typeof OnboardingCheckpoint
              ],
            )
            .setEmail(data.Items[0].email)
            .build();
        } else {
          this.logger.debug(
            `Onboarding not found by index: ${indexCriteria.indexName}`,
          );
          return undefined;
        }
      })
      .catch((error: Error) => {
        this.logger.error(
          {
            err: {
              type: error.name,
              message: error.message,
              stack: error.stack,
            },
          },
          `Failed to find onboarding by index: ${error.message}`,
        );
        throw new InternalServerErrorException(
          'Unexpected error while finding onboarding by index. Try again later.',
        );
      });
  }

  async findByPk(
    primaryKeyCriteria: PrimaryKeyCriteria,
  ): Promise<Onboarding | undefined> {
    const queryCmd = this.buildQueryByPrimaryKeyCmd(primaryKeyCriteria);
    return this.dynamoClient
      .send(queryCmd)
      .then((data) => {
        if (data.Items && data.Items.length > 0) {
          this.logger.debug('Onboarding found by query.');
          return Onboarding.builder()
            .setOnboardingId(data.Items[0].onboardingId)
            .setCheckpoint(
              OnboardingCheckpoint[
                data.Items[0].checkpoint as keyof typeof OnboardingCheckpoint
              ],
            )
            .setEmail(data.Items[0].email)
            .build();
        } else {
          this.logger.debug('Onboarding not found by email:');
          return undefined;
        }
      })
      .catch((error: Error) => {
        this.logger.error(
          {
            err: {
              type: error.name,
              message: error.message,
              stack: error.stack,
            },
          },
          `Failed to find onboarding by primary key: ${error.message}`,
        );
        throw new InternalServerErrorException(
          'Unexpected error while finding onboarding by primary key. Try again later.',
        );
      });
  }

  async upsert(
    upsertCriteria: UpsertCriteria<Onboarding>,
  ): Promise<Onboarding> {
    const onboardingEntity = upsertCriteria.entity;
    this.logger.debug(
      { onboardingId: onboardingEntity.getOnboardingId() },
      'Create or replace onboarding in Dynamo.',
    );
    const putCmd = this.buildPutOnboardingCmd(upsertCriteria.entity);
    return this.dynamoClient
      .send(putCmd)
      .then((item) => {
        this.logger.debug(
          { onboardingId: onboardingEntity.getOnboardingId() },
          `Onboarding created or replaced sucessfully: ${JSON.stringify(item)}`,
        );
        return Onboarding.builder()
          .setOnboardingId(onboardingEntity.getOnboardingId())
          .setCheckpoint(
            OnboardingCheckpoint[
              onboardingEntity.getCheckpoint() as keyof typeof OnboardingCheckpoint
            ],
          )
          .setEmail(onboardingEntity.getEmail())
          .build();
      })
      .catch((error: Error) => {
        this.logger.error(
          { onboardingId: onboardingEntity.getOnboardingId(), error },
          `Failed to create or replace onboarding: ${error.message}`,
        );
        throw new InternalServerErrorException(
          'Unexpected error while creating or replacing onboarding. Try again later.',
        );
      });
  }

  async patch(patchCriteria: PatchCriteria): Promise<Onboarding> {
    const updateCmd = this.buildUpdateOnboardingCmd(patchCriteria);
    return this.dynamoClient
      .send(updateCmd)
      .then((item) => {
        if (item.Attributes) {
          return Onboarding.builder()
            .setOnboardingId(item.Attributes.onboardingId)
            .setEmail(item.Attributes.email)
            .setCheckpoint(
              OnboardingCheckpoint[
                item.Attributes.checkpoint as keyof typeof OnboardingCheckpoint
              ],
            )
            .build();
        } else {
          throw new InternalServerErrorException(
            'Failed to create onboarding.',
          );
        }
      })
      .catch((error) => {
        this.logger.error('Unexpected error while creating onboarding.', error);
        throw new InternalServerErrorException('Failed to create onboarding.');
      });
  }

  private buildQueryByPrimaryKeyCmd(primaryKeyCriteria: PrimaryKeyCriteria) {
    const { primaryKeyExpression, filterExpression, values } =
      primaryKeyCriteria;
    const queryCmd = new QueryCommand({
      TableName: this.TABLE_NAME,
      KeyConditionExpression: primaryKeyExpression,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: {
        ...values,
      },
    });
    return queryCmd;
  }

  private buildQueryByIndexCmd(indexCriteria: IndexCriteria): QueryCommand {
    const { indexExpression, indexName, filterExpression, values } =
      indexCriteria;

    if (filterExpression) {
      const queryCmd = new QueryCommand({
        TableName: this.TABLE_NAME,
        KeyConditionExpression: indexExpression,
        IndexName: indexName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: {
          ...values,
        },
      });
      return queryCmd;
    } else {
      const queryCmd = new QueryCommand({
        TableName: this.TABLE_NAME,
        KeyConditionExpression: indexExpression,
        IndexName: indexName,
        ExpressionAttributeValues: {
          ...values,
        },
      });
      return queryCmd;
    }
  }

  private buildPutOnboardingCmd(onboarding: Onboarding): PutCommand {
    this.logger.debug(
      { onboardingId: onboarding.getOnboardingId() },
      'Building PutCommand to create or replace onboarding.',
    );
    const putCmd = new PutCommand({
      TableName: this.TABLE_NAME,
      Item: {
        onboardingId: onboarding.getOnboardingId(),
        checkpoint: onboarding.getCheckpoint(),
        email: onboarding.getEmail(),
      },
    });
    return putCmd;
  }

  private buildUpdateOnboardingCmd(
    patchCriteria: PatchCriteria,
  ): UpdateCommand {
    const [partitionKey, partitionKeyValue] = patchCriteria.partitionKey;
    const updateExpression = patchCriteria.patchExpression;
    const values = patchCriteria.values;

    if (!patchCriteria.sortKey) {
      const key: Record<string, string | number | boolean> = {
        [partitionKey]: partitionKeyValue,
      };
      const updateCmd = new UpdateCommand({
        TableName: this.TABLE_NAME,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: {
          ...values,
        },
        ReturnValues: 'ALL_NEW',
      });
      return updateCmd;
    } else {
      const [sortKey, sortKeyValue] = patchCriteria.sortKey;
      const key: Record<string, string | number | boolean> = {
        [partitionKey]: partitionKeyValue,
        [sortKey]: sortKeyValue,
      };
      const updateCmd = new UpdateCommand({
        TableName: this.TABLE_NAME,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: {
          ...values,
        },
        ReturnValues: 'ALL_NEW',
      });
      return updateCmd;
    }
  }
}
