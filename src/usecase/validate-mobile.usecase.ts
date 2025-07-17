import { Injectable } from '@nestjs/common';
import { MobileStatus } from 'src/domain/entity/mobile-status.enum';
import { Onboarding } from 'src/domain/entity/onboarding';
import { OnboardingRepository } from 'src/domain/repository/onboarding.repository';
import { OnboardingCheckpoint } from 'src/domain/entity/onboarding-checkpoint.enum';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { IndexCriteria } from 'src/domain/repository/criteria/index.criteria';
import { PrimaryKeyCriteria } from 'src/domain/repository/criteria/primary-key.criteria';
import { OnboardingRuleViolationError } from 'src/domain/error/onboarding-rule-violation.error';
import { ErrorUtilsService } from 'src/domain/service/error-utils.service';

@Injectable()
export class ValidateMobileUsecase {
  constructor(
    @InjectPinoLogger(ValidateMobileUsecase.name)
    private readonly logger: PinoLogger,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  async exe(
    onboardingId: string,
    mobile: string,
  ): Promise<[Onboarding, MobileStatus]> {
    try {
      this.logger.info(
        { onboardingId },
        `Executing: ${ValidateMobileUsecase.name}`,
      );
      const mobileIndexCriteria = this.buildMobileIndexCriteira(
        onboardingId,
        mobile,
      );
      const onboardingFound =
        await this.onboardingRepository.findByIndex(mobileIndexCriteria);
      if (!onboardingFound) {
        const primaryKeyCriteria = this.buildPrimaryKeyCriteria(onboardingId);
        const onboardingConfirmed =
          await this.onboardingRepository.findByPk(primaryKeyCriteria);
        if (!onboardingConfirmed) {
          this.logger.error(
            { onboardingId },
            `Cannot proceed with mobile validation, the onboarding is not a ${OnboardingCheckpoint.EMAIL_CONFIRMED} checkpoint.`,
          );
          throw new OnboardingRuleViolationError(
            `Cannot validate mobile: onboarding must be in ${OnboardingCheckpoint.EMAIL_CONFIRMED} checkpoint.`,
          );
        } else {
          this.logger.info(
            { onboardingId },
            `Mobile validation completed successfully: ${mobile} is available to use`,
          );
          return [onboardingConfirmed, MobileStatus.AVAILABLE];
        }
      } else {
        if (
          OnboardingCheckpoint.EMAIL_CONFIRMED ===
          onboardingFound.getCheckpoint()
        ) {
          this.logger.info(
            { onboardingId },
            `Mobile validation completed successfully: The onboarding is in EMAIL_CONFIRMED state for ${mobile}`,
          );
          return [onboardingFound, MobileStatus.AVAILABLE];
        } else {
          this.logger.warn(
            { onboardingId },
            `Cannot proceed: mobile ${mobile} is already associated with onboarding: ${onboardingFound.getOnboardingId()} (checkpoint: ${onboardingFound.getCheckpoint()}).`,
          );
          return [onboardingFound, MobileStatus.ALREADY_TAKEN];
        }
      }
    } catch (error: unknown) {
      const [, serializedErrorObject] = ErrorUtilsService.normalizeError(error);
      this.logger.error(
        `Failed to execute ${ValidateMobileUsecase.name}: ${serializedErrorObject.message}`,
      );
      throw error;
    }
  }

  private buildMobileIndexCriteira(
    onboardingId: string,
    mobile: string,
  ): IndexCriteria {
    this.logger.info(
      { onboardingId },
      'Building query criteria for mobile-index lookup. ',
    );
    const queryByIndexCriteria: IndexCriteria = {
      indexExpression: 'mobile = :mobile',
      indexName: 'mobile-index',
      values: {
        ':mobile': mobile,
      },
    };
    return queryByIndexCriteria;
  }

  private buildPrimaryKeyCriteria(onboardingId: string): PrimaryKeyCriteria {
    const query: PrimaryKeyCriteria = {
      primaryKeyExpression: 'onboardingId = :onboardingId',
      filterExpression: 'checkpoint = :checkpoint',
      values: {
        ':onboardingId': onboardingId,
        ':checkpoint': OnboardingCheckpoint.EMAIL_CONFIRMED,
      },
    };
    return query;
  }
}
