import { Injectable } from '@nestjs/common';
import { EmailStatus } from '../domain/entity/email-status.enum';
import { OnboardingRepository } from '../domain/repository/onboarding.repository';
import { OnboardingStatus } from '../domain/entity/onboarding-status.enum';
import { Onboarding } from '../domain/entity/onboarding';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { IndexCriteria } from 'src/domain/repository/criteria/index.criteria';
import { UpsertCriteria } from 'src/domain/repository/criteria/upsert.criteria';

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
    this.logger.info({ onboardingId }, `Start email validation: ${email}`);
    return this.onboardingRepository
      .findOnboardingByIndex(this.buildEmailIndexCriteria(onboardingId, email))
      .then((onboardingFound) => {
        if (!onboardingFound) {
          this.logger.info(
            { onboardingId },
            `Proceeding to create a new onboarding with email: ${email}`,
          );
          const upsertCriteria = this.buildUpsertOnboardingCriteria(
            onboardingId,
            email,
          );
          return this.onboardingRepository
            .upsert(upsertCriteria)
            .then((onboardingCreated) => {
              this.logger.info(
                { onboardingId },
                `Email validation completed successfully: ${email} is available to use`,
              );
              return [onboardingCreated, EmailStatus.AVAILABLE];
            });
        } else {
          if (OnboardingStatus.INITIATED === onboardingFound.getStatus()) {
            this.logger.info(
              { onboardingId },
              `Email validation completed successfully: The onboarding is already INITIATED for ${email}`,
            );
            return [onboardingFound, EmailStatus.AVAILABLE];
          } else {
            this.logger.warn(
              { onboardingId },
              `Cannot proceed: email ${email} is already associated with onboarding: ${onboardingFound.getOnboardingId()} (status: ${onboardingFound.getStatus()}).`,
            );
            return [onboardingFound, EmailStatus.ALREADY_TAKEN];
          }
        }
      });
  }

  private buildUpsertOnboardingCriteria(
    onboardingId: string,
    email: string,
  ): UpsertCriteria<Onboarding> {
    this.logger.info(
      { onboardingId },
      'Building upsert criteria for new onboarding entity. ',
    );
    const obToCreate = Onboarding.builder()
      .setOnboardingId(onboardingId)
      .setStatus(OnboardingStatus.INITIATED)
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
      'Building query criteria for email-index lookup. ',
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
