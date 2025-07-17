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
  QueryCommandInput,
  UpdateCommand,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { IndexCriteria } from './criteria/index.criteria';
import { PrimaryKeyCriteria } from './criteria/primary-key.criteria';
import { PatchCriteria } from './criteria/patch.criteria';
import { UpsertCriteria } from './criteria/upsert.criteria';
import { ConfigService } from '@nestjs/config';
import { ErrorUtilsService } from '../service/error-utils.service';
import { ErrorObject } from '../entity/error-object';
import { OnboardingRepositoryError } from '../error/onboarding-repository.error';

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

      this.logger.error(
        'Unexpected error while accessing onboarding table configuration. Please check service setup.',
      );
      throw new OnboardingRepositoryError(
        'Unexpected error while accessing onboarding table configuration. Please check service setup.',
      );
    } else {
      this.TABLE_NAME = dynamoTableName;
    }
  }

  async findByIndex(
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
            `Onboarding not found by index: ${indexCriteria.indexName}. `,
          );
          return undefined;
        }
      })
      .catch((error: unknown) => {
        const [, serializedErrorObject]: [Error, ErrorObject] =
          ErrorUtilsService.normalizeError(error);
        this.logger.error(
          { err: serializedErrorObject },
          `There was an error while executing the QueryCommand in database to find onboarding by index: ${serializedErrorObject.message}. `,
        );
        throw new OnboardingRepositoryError(
          'Failed to execute the QueryCommand to find onboarding by index. ',
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
          this.logger.debug('Onboarding found by primaryKey.');
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
          this.logger.debug('Onboarding not found by primaryKey. ');
          return undefined;
        }
      })
      .catch((error: Error) => {
        const [, serializedErrorObject]: [Error, ErrorObject] =
          ErrorUtilsService.normalizeError(error);
        this.logger.error(
          { err: serializedErrorObject },
          `There was an error while executing the QueryCommand in database to find onboarding by primaryKey: ${serializedErrorObject.message}. `,
        );
        throw new OnboardingRepositoryError(
          'Failed to execute the QueryCommand to find onboarding by primaryKey. ',
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
      .catch((error: unknown) => {
        const [, serializedErrorObject]: [Error, ErrorObject] =
          ErrorUtilsService.normalizeError(error);
        this.logger.error(
          { err: serializedErrorObject },
          `There was an error while executing the PutCommand in database to insert or replace onboarding: ${serializedErrorObject.message}. `,
        );
        throw new OnboardingRepositoryError(
          'Failed to execute the PutCommand to insert or replace onboarding. ',
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
      .catch((error: unknown) => {
        const [, serializedErrorObject]: [Error, ErrorObject] =
          ErrorUtilsService.normalizeError(error);
        this.logger.error(
          { err: serializedErrorObject },
          `There was an error while executing the UpdateCommand in database to partially update onboarding: ${serializedErrorObject.message}. `,
        );
        throw new OnboardingRepositoryError(
          'Failed to execute the UpdateCommand to partially update onboarding. ',
        );
      });
  }

  private buildQueryByPrimaryKeyCmd(primaryKeyCriteria: PrimaryKeyCriteria) {
    const { primaryKeyExpression, filterExpression, values } =
      primaryKeyCriteria;
    const input: QueryCommandInput = {
      TableName: this.TABLE_NAME,
      KeyConditionExpression: primaryKeyExpression,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: {
        ...values,
      },
    };
    this.logger.debug(
      { commandInput: input },
      'ready to execute QueryCommand by primaryKey. ',
    );
    return new QueryCommand(input);
  }

  private buildQueryByIndexCmd(indexCriteria: IndexCriteria): QueryCommand {
    const { indexExpression, indexName, filterExpression, values } =
      indexCriteria;

    if (filterExpression) {
      const input: QueryCommandInput = {
        TableName: this.TABLE_NAME,
        KeyConditionExpression: indexExpression,
        IndexName: indexName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: {
          ...values,
        },
      };
      this.logger.debug(
        { commandInput: input },
        'ready to execute QueryCommand by index with filters. ',
      );
      return new QueryCommand(input);
    } else {
      const input: QueryCommandInput = {
        TableName: this.TABLE_NAME,
        KeyConditionExpression: indexExpression,
        IndexName: indexName,
        ExpressionAttributeValues: {
          ...values,
        },
      };
      this.logger.debug(
        { commandInput: input },
        'ready to execute QueryCommand by index with filters. ',
      );
      const queryCmd = new QueryCommand(input);
      return queryCmd;
    }
  }

  private buildPutOnboardingCmd(onboarding: Onboarding): PutCommand {
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
      const input: UpdateCommandInput = {
        TableName: this.TABLE_NAME,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: {
          ...values,
        },
        ReturnValues: 'ALL_NEW',
      };
      this.logger.debug(
        { commandInput: input },
        'ready to execute UpdateCommand. ',
      );
      const updateCmd = new UpdateCommand(input);
      return updateCmd;
    } else {
      const [sortKey, sortKeyValue] = patchCriteria.sortKey;
      const key: Record<string, string | number | boolean> = {
        [partitionKey]: partitionKeyValue,
        [sortKey]: sortKeyValue,
      };
      const input: UpdateCommandInput = {
        TableName: this.TABLE_NAME,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: {
          ...values,
        },
        ReturnValues: 'ALL_NEW',
      };
      this.logger.debug(
        { commandInput: input },
        'ready to execute UpdateCommand. ',
      );
      const updateCmd = new UpdateCommand(input);
      return updateCmd;
    }
  }
}
