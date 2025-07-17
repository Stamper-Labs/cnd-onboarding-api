import { Injectable } from '@nestjs/common';
import { EmailStatus } from '../domain/entity/email-status.enum';
import { OnboardingRepository } from '../domain/repository/onboarding.repository';
import { OnboardingCheckpoint } from '../domain/entity/onboarding-checkpoint.enum';
import { Onboarding } from '../domain/entity/onboarding';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IndexCriteria } from 'src/domain/repository/criteria/index.criteria';
import { UpsertCriteria } from 'src/domain/repository/criteria/upsert.criteria';
import { ErrorUtilsService } from 'src/domain/service/error-utils.service';

@Injectable()
export class ValidateEmailUsecase {
  constructor(
    @InjectPinoLogger(ValidateEmailUsecase.name)
    private readonly logger: PinoLogger,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  async exe(
    email: string,
    onboardingId: string,
  ): Promise<[Onboarding, EmailStatus]> {
    this.logger.info(
      { onboardingId },
      `Executing: ${ValidateEmailUsecase.name}`,
    );

    return this.onboardingRepository
      .findByIndex(this.buildEmailIndexCriteria(onboardingId, email))
      .then((onboardingFound): Promise<[Onboarding, EmailStatus]> => {
        if (!onboardingFound) {
          this.logger.info(
            { onboardingId },
            `No onboarding found for the provided email: ${email}, proceeding to create a new onboarding.`,
          );
          const upsertCriteria = this.buildUpsertOnboardingCriteria(
            onboardingId,
            email,
          );
          return this.onboardingRepository
            .upsert(upsertCriteria)
            .then((onboardingCreated): [Onboarding, EmailStatus] => {
              this.logger.info(
                { onboardingId },
                `Onboarding successfully advanced to the first checkpoint '${onboardingCreated.getCheckpoint()}' with email: ${email}.`,
              );
              return [onboardingCreated, EmailStatus.AVAILABLE];
            });
        }
        if (
          onboardingFound.getCheckpoint() === OnboardingCheckpoint.INITIATED
        ) {
          this.logger.info(
            { onboardingId },
            `An onboarding already exists at the '${OnboardingCheckpoint.INITIATED}' checkpoint for email ${onboardingFound.getEmail()}. Proceeding with the existing record.`,
          );
          return Promise.resolve([onboardingFound, EmailStatus.AVAILABLE]);
        } else {
          this.logger.warn(
            { onboardingId },
            `Email ${email} is already associated with onboarding ${onboardingFound.getOnboardingId()} at checkpoint '${onboardingFound.getCheckpoint()}'.`,
          );
          return Promise.resolve([onboardingFound, EmailStatus.ALREADY_TAKEN]);
        }
      })
      .catch((error: unknown) => {
        const [, serializedErrorObject] =
          ErrorUtilsService.normalizeError(error);
        this.logger.error(
          { onboardingId, err: serializedErrorObject },
          `Failed to execute ${ValidateEmailUsecase.name}: ${serializedErrorObject.message}`,
        );
        throw error;
      });
  }

  private buildUpsertOnboardingCriteria(
    onboardingId: string,
    email: string,
  ): UpsertCriteria<Onboarding> {
    this.logger.info(
      { onboardingId },
      'Preparing criteria to persist a new onboarding. ',
    );
    const obToCreate = Onboarding.builder()
      .setOnboardingId(onboardingId)
      .setCheckpoint(OnboardingCheckpoint.INITIATED)
      .setEmail(email)
      .build();
    const upsertCriteria: UpsertCriteria<Onboarding> = {
      entity: obToCreate,
    };
    return upsertCriteria;
  }

  private buildEmailIndexCriteria(
    onboardingId: string,
    email: string,
  ): IndexCriteria {
    this.logger.info(
      { onboardingId },
      'Preparing criteria to look for onboarding by email-index.',
    );
    const queryByIndexCriteria: IndexCriteria = {
      indexExpression: 'email = :email',
      indexName: 'email-index',
      values: {
        ':email': email,
      },
    };
    return queryByIndexCriteria;
  }
}
