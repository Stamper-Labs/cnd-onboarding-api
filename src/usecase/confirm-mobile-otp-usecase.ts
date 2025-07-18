import { OnboardingRepository } from '../domain/repository/onboarding.repository';
import { OnboardingCheckpoint } from 'src/domain/entity/onboarding-checkpoint.enum';
import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { PrimaryKeyCriteria } from 'src/domain/repository/criteria/primary-key.criteria';
import { PatchCriteria } from 'src/domain/repository/criteria/patch.criteria';
import { Onboarding } from 'src/domain/entity/onboarding';
import { OnboardingRuleViolationError } from 'src/domain/error/onboarding-rule-violation.error';
import { ErrorUtilsService } from 'src/domain/service/error-utils.service';

@Injectable()
export class ConfirmMobileOtpUsecase {
  private static FALLBACK_OTP = '000000';

  constructor(
    @InjectPinoLogger(ConfirmMobileOtpUsecase.name)
    private readonly logger: PinoLogger,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  async exe(
    onboardingId: string,
    mobile: string,
    otp: string,
  ): Promise<Onboarding> {
    try {
      this.logger.info(
        { onboardingId },
        `Executing: ${ConfirmMobileOtpUsecase.name}`,
      );
      const queryExpression = this.buildPrimaryKeyCriteriaForMobile(
        onboardingId,
        mobile,
      );
      const onboardingFound =
        await this.onboardingRepository.findByPk(queryExpression);
      if (!onboardingFound) {
        this.logger.error(
          { onboardingId },
          `Either no onboarding found for mobile ${mobile}, or it is not at the ${OnboardingCheckpoint.MOBILE_OTP_SENT} checkpoint`,
        );
        throw new OnboardingRuleViolationError(
          'Cannot confirm OTP, onboarding not found or not at required checkpoint.',
        );
      } else {
        let isValidOtp = false;
        if (ConfirmMobileOtpUsecase.FALLBACK_OTP === otp) {
          this.logger.warn(
            { onboardingId },
            `Using fallback OTP for mobile: ${mobile}`,
          );
          isValidOtp = true; // Fallback for testing purposes
        } else {
          this.logger.warn(
            { onboardingId },
            `Using real OTP for mobile: ${mobile}`,
          );
          isValidOtp = authenticator.check(otp, onboardingId);
        }
        if (isValidOtp) {
          const patchCriteria: PatchCriteria = {
            partitionKey: ['onboardingId', onboardingId],
            patchExpression: 'SET checkpoint = :checkpoint',
            values: {
              ':checkpoint': OnboardingCheckpoint.MOBILE_CONFIRMED,
            },
          };
          const onboardingUpd =
            await this.onboardingRepository.patch(patchCriteria);
          this.logger.info(
            { onboardingId: onboardingUpd.getOnboardingId() },
            `OTP is valid. Onboarding successfully advanced to the next checkpoint: '${onboardingUpd.getCheckpoint()}'. `,
          );
          return onboardingUpd;
        } else {
          this.logger.error(
            { onboardingId },
            `The OTP is either expired or does not match the one previously sent to mobile: ${mobile}.`,
          );
          throw new OnboardingRuleViolationError(
            'OTP confirmation failed: the provided code has expired or does not match.',
          );
        }
      }
    } catch (error: unknown) {
      const [, serializedErrorObject] = ErrorUtilsService.normalizeError(error);
      this.logger.error(
        `Failed to execute ${ConfirmMobileOtpUsecase.name}: ${serializedErrorObject.message}`,
      );
      throw error;
    }
  }

  private buildPrimaryKeyCriteriaForMobile(
    onboardingId: string,
    mobile: string,
  ): PrimaryKeyCriteria {
    this.logger.info(
      { onboardingId },
      'Preparing criteria to look for onbarding by mobile and checkpoint.',
    );
    const queryByPkCriteria: PrimaryKeyCriteria = {
      primaryKeyExpression: 'onboardingId = :onboardingId',
      filterExpression:
        'checkpoint = :checkpoint_MOBILE_OTP_SENT AND mobile = :mobile',
      values: {
        ':onboardingId': onboardingId,
        ':mobile': mobile,
        ':checkpoint_MOBILE_OTP_SENT': 'MOBILE_OTP_SENT',
      },
    };
    return queryByPkCriteria;
  }
}
