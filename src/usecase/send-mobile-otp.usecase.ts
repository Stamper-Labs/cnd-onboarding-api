import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { OnboardingRepository } from '../domain/repository/onboarding.repository';
import { OnboardingCheckpoint } from 'src/domain/entity/onboarding-checkpoint.enum';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { PrimaryKeyCriteria } from 'src/domain/repository/criteria/primary-key.criteria';
import { PatchCriteria } from 'src/domain/repository/criteria/patch.criteria';
import { OnboardingRuleViolationError } from 'src/domain/error/onboarding-rule-violation.error';
import { ErrorUtilsService } from 'src/domain/service/error-utils.service';

@Injectable()
export class SendMobileOtpUsecase {
  constructor(
    @InjectPinoLogger(SendMobileOtpUsecase.name)
    private readonly logger: PinoLogger,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  async exe(mobile: string, onboardingId: string): Promise<string> {
    try {
      this.logger.info(
        { onboardingId },
        `Executing: ${SendMobileOtpUsecase.name}`,
      );
      const queryExpressionForMobile = this.buildPrimaryKeyCriteriaForMobile(
        onboardingId,
        mobile,
      );
      const onboardingFound = await this.onboardingRepository.findByPk(
        queryExpressionForMobile,
      );
      if (!onboardingFound) {
        this.logger.error(
          { onboardingId },
          `No onboarding found for mobile ${mobile} at either '${OnboardingCheckpoint.MOBILE_VALIDATED}' or '${OnboardingCheckpoint.MOBILE_OTP_SENT}' checkpoint.`,
        );
        throw new OnboardingRuleViolationError(
          'Cannot send OTP, the mobile has not been validated.',
        );
      } else {
        const otp = authenticator.generate(onboardingFound.getOnboardingId());
        // TODO send OTP via SMS
        this.logger.info(
          { onboardingId },
          `OTP generated and sent to mobile: ${mobile}`,
        );
        const patchCriteria: PatchCriteria = {
          partitionKey: ['onboardingId', onboardingId],
          patchExpression: 'SET checkpoint = :checkpoint',
          values: {
            ':checkpoint': OnboardingCheckpoint.MOBILE_OTP_SENT,
          },
        };
        const onboardingPatched =
          await this.onboardingRepository.patch(patchCriteria);
        this.logger.info(
          { onboardingId },
          `onboarding sucessfully advanced to the next checkpoint: ${onboardingPatched.getCheckpoint()}`,
        );
        return otp;
      }
    } catch (error: unknown) {
      const [, serializedErrorObject] = ErrorUtilsService.normalizeError(error);
      this.logger.error(
        `Failed to execute ${SendMobileOtpUsecase.name}: ${serializedErrorObject.message}`,
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
      'Preparing criteria to find onboarding by mobile at MOBILE_VALIDATED or MOBILE_OTP_SENT checkpoint.',
    );
    const queryByPkCriteria: PrimaryKeyCriteria = {
      primaryKeyExpression: 'onboardingId = :onboardingId',
      filterExpression:
        '(checkpoint = :checkpoint_MOBILE_VALIDATED OR checkpoint = :checkpoint_MOBILE_OTP_SENT) AND mobile = :mobile',
      values: {
        ':onboardingId': onboardingId,
        ':mobile': mobile,
        ':checkpoint_MOBILE_VALIDATED': OnboardingCheckpoint.MOBILE_VALIDATED,
        ':checkpoint_MOBILE_OTP_SENT': OnboardingCheckpoint.MOBILE_OTP_SENT,
      },
    };

    return queryByPkCriteria;
  }
}
