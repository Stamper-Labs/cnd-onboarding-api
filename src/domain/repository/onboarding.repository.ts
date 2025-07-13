import { Inject, Injectable } from '@nestjs/common';
import { InternalServerErrorException } from '@nestjs/common';
import { Onboarding } from '../entity/onboarding';
import { OnboardingStatus } from '../entity/onboarding-status.enum';
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

@Injectable()
export class OnboardingRepository {
  private readonly TABLE_NAME: string = 'cnd-onboarding-api-tb';

  constructor(
    @InjectPinoLogger(OnboardingRepository.name)
    private readonly logger: PinoLogger,
    @Inject('DYNAMO_CLIENT')
    private readonly dynamoClient: DynamoDBDocumentClient,
  ) {}

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
            .setStatus(
              OnboardingStatus[
                data.Items[0].status as keyof typeof OnboardingStatus
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
            .setStatus(
              OnboardingStatus[
                data.Items[0].status as keyof typeof OnboardingStatus
              ],
            )
            .setEmail(data.Items[0].email)
            .build();
        } else {
          this.logger.debug('Onboarding not found by email:');
          return undefined;
        }
      })
      .catch((error) => {
        this.logger.error(
          'Unexpected error while fetching onboarding by email',
          error,
        );
        throw new InternalServerErrorException(
          'Failed to fetch onboarding by email.',
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
          .setStatus(
            OnboardingStatus[
              onboardingEntity.getStatus() as keyof typeof OnboardingStatus
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
            .setStatus(
              OnboardingStatus[
                item.Attributes.status as keyof typeof OnboardingStatus
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
        status: onboarding.getStatus(),
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
