import { Injectable } from '@nestjs/common';
import { MobileStatus } from 'src/domain/entity/mobile-status.enum';
import { Onboarding } from 'src/domain/entity/onboarding';
import { OnboardingRepository } from 'src/domain/repository/onboarding.repository';
import { OnboardingStatus } from 'src/domain/entity/onboarding-status.enum';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { IndexCriteria } from 'src/domain/repository/criteria/index.criteria';
import { PrimaryKeyCriteria } from 'src/domain/repository/criteria/primary-key.criteria';
import { OnboardingNotEmailConfirmedError } from 'src/domain/error/onboarding-not-email-confirmed.error';

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
    this.logger.info({ onboardingId }, `Start mobile validation: ${mobile}`);
    const mobileIndexCriteria = this.buildMobileIndexCriteira(
      onboardingId,
      mobile,
    );
    const onboardingFound =
      await this.onboardingRepository.findOnboardingByIndex(
        mobileIndexCriteria,
      );
    if (!onboardingFound) {
      const primaryKeyCriteria = this.buildPrimaryKeyCriteria(
        onboardingId,
        OnboardingStatus.EMAIL_CONFIRMED,
      );
      const onboardingConfirmed =
        await this.onboardingRepository.findByPk(primaryKeyCriteria);
      if (!onboardingConfirmed) {
        this.logger.error(
          { onboardingId },
          `Cannot proceed with mobile validation, the onboarding is not in ${OnboardingStatus.EMAIL_CONFIRMED} status.`,
        );
        throw new OnboardingNotEmailConfirmedError(
          `Cannot validate mobile: onboarding must be in ${OnboardingStatus.EMAIL_CONFIRMED} status.`,
        );
      } else {
        this.logger.info(
          { onboardingId },
          `Mobile validation completed successfully: ${mobile} is available to use`,
        );
        return [onboardingConfirmed, MobileStatus.AVAILABLE];
      }
    } else {
      if (OnboardingStatus.EMAIL_CONFIRMED === onboardingFound.getStatus()) {
        this.logger.info(
          { onboardingId },
          `Mobile validation completed successfully: The onboarding is in EMAIL_CONFIRMED state for ${mobile}`,
        );
        return [onboardingFound, MobileStatus.AVAILABLE];
      } else {
        this.logger.warn(
          { onboardingId },
          `Cannot proceed: mobile ${mobile} is already associated with onboarding: ${onboardingFound.getOnboardingId()} (status: ${onboardingFound.getStatus()}).`,
        );
        return [onboardingFound, MobileStatus.ALREADY_TAKEN];
      }
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

  private buildPrimaryKeyCriteria(
    onboardingId: string,
    status: OnboardingStatus,
  ): PrimaryKeyCriteria {
    const query: PrimaryKeyCriteria = {
      primaryKeyExpression: 'onboardingId = :onboardingId',
      filterExpression: 'status = :status',
      values: {
        ':onboardingId': onboardingId,
        ':status': status,
      },
    };
    return query;
  }
}
