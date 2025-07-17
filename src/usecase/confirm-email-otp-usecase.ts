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
export class ConfirmEmailOtpUsecase {
  private static FALLBACK_OTP = '000000';

  constructor(
    @InjectPinoLogger(ConfirmEmailOtpUsecase.name)
    private readonly logger: PinoLogger,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  async exe(
    onboardingId: string,
    email: string,
    otp: string,
  ): Promise<Onboarding> {
    try {
      this.logger.info(
        { onboardingId },
        `Executing: ${ConfirmEmailOtpUsecase.name}`,
      );
      const queryExpression = this.buildPrimaryKeyCriteriaForEmail(
        onboardingId,
        email,
      );
      const onboardingFound =
        await this.onboardingRepository.findByPk(queryExpression);
      if (!onboardingFound) {
        this.logger.error(
          { onboardingId },
          `Either no onboarding found for email ${email}, or it is not at the ${OnboardingCheckpoint.INITIATED} checkpoint`,
        );
        throw new OnboardingRuleViolationError(
          'Cannot confirm OTP, onboarding not found or not at required checkpoint.',
        );
      } else {
        let isValidOtp = false;
        if (ConfirmEmailOtpUsecase.FALLBACK_OTP === otp) {
          this.logger.warn(
            { onboardingId },
            `Using fallback OTP for email: ${email}`,
          );
          isValidOtp = true; // Fallback for testing purposes
        } else {
          this.logger.warn(
            { onboardingId },
            `Using real OTP for email: ${email}`,
          );
          isValidOtp = authenticator.check(otp, onboardingId);
        }
        if (isValidOtp) {
          const patchCriteria: PatchCriteria = {
            partitionKey: ['onboardingId', onboardingId],
            patchExpression: 'SET checkpoint = :checkpoint',
            values: {
              ':checkpoint': OnboardingCheckpoint.EMAIL_CONFIRMED,
            },
          };
          const onboardingUpd =
            await this.onboardingRepository.patch(patchCriteria);
          this.logger.info(
            { onboardingId: onboardingUpd.getOnboardingId() },
            `OTP is valid. Onboarding successfully advanced to the '${OnboardingCheckpoint.EMAIL_CONFIRMED}' checkpoint.`,
          );
          return onboardingUpd;
        } else {
          this.logger.error(
            { onboardingId },
            `The OTP is either expired or does not match the one previously sent to email: ${email}.`,
          );
          throw new OnboardingRuleViolationError(
            'OTP confirmation failed: the provided code has expired or does not match.',
          );
        }
      }
    } catch (error: unknown) {
      const [, serializedErrorObject] = ErrorUtilsService.normalizeError(error);
      this.logger.error(
        `Failed to execute ${ConfirmEmailOtpUsecase.name}: ${serializedErrorObject.message}`,
      );
      throw error;
    }
  }

  private buildPrimaryKeyCriteriaForEmail(
    onboardingId: string,
    email: string,
  ): PrimaryKeyCriteria {
    this.logger.info(
      { onboardingId },
      'Preparing criteria to look for onbarding by email and checkpoint.',
    );
    const queryByPkCriteria: PrimaryKeyCriteria = {
      primaryKeyExpression: 'onboardingId = :onboardingId',
      filterExpression:
        'checkpoint IN (:checkpoint_INITIATED, :checkpoint_EMAIL_OTP_SENT) AND email = :email',
      values: {
        ':onboardingId': onboardingId,
        ':email': email,
        ':checkpoint_INITIATED': 'INITIATED',
        ':checkpoint_EMAIL_OTP_SENT': 'EMAIL_OTP_SENT',
      },
    };
    return queryByPkCriteria;
  }
}
