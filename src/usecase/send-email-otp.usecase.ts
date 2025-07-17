import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { OnboardingRepository } from '../domain/repository/onboarding.repository';
import { OnboardingCheckpoint } from 'src/domain/entity/onboarding-checkpoint.enum';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { PrimaryKeyCriteria } from 'src/domain/repository/criteria/primary-key.criteria';
import { PatchCriteria } from 'src/domain/repository/criteria/patch.criteria';
import { OnboardingRuleViolationError } from 'src/domain/error/onboarding-rule-violation.error';

@Injectable()
export class SendEmailOtpUsecase {
  constructor(
    @InjectPinoLogger(SendEmailOtpUsecase.name)
    private readonly logger: PinoLogger,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  async exe(email: string, onboardingId: string): Promise<string> {
    try {
      this.logger.info(
        { onboardingId },
        `Executing: ${SendEmailOtpUsecase.name}`,
      );
      const queryExpressionForEmail = this.buildPrimaryKeyCriteriaForEmail(
        onboardingId,
        email,
      );
      const onboardingFound = await this.onboardingRepository.findByPk(
        queryExpressionForEmail,
      );
      if (!onboardingFound) {
        this.logger.error(
          { onboardingId },
          `No onboarding found for email ${email} at the '${OnboardingCheckpoint.INITIATED}' checkpoint.`,
        );
        throw new OnboardingRuleViolationError(
          'Cannot send OTP, the email has not been validated.',
        );
      } else {
        const otp = authenticator.generate(onboardingFound.getOnboardingId());
        // TODO send OTP vial email
        this.logger.info(
          { onboardingId },
          `OTP generated and sent to email: ${email}`,
        );
        const patchCriteria: PatchCriteria = {
          partitionKey: ['onboardingId', onboardingId],
          patchExpression: 'SET checkpoint = :checkpoint',
          values: {
            ':checkpoint': OnboardingCheckpoint.EMAIL_OTP_SENT,
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
      this.logger.error('Impossible to send OTP to email');
      throw error;
    }
  }

  private buildPrimaryKeyCriteriaForEmail(
    onboardingId: string,
    email: string,
  ): PrimaryKeyCriteria {
    this.logger.info(
      { onboardingId },
      'Preparing criteria to find onboarding by email at INITIATED or EMAIL_OTP_SENT checkpoint.',
    );

    const queryByPkCriteria: PrimaryKeyCriteria = {
      primaryKeyExpression: 'onboardingId = :onboardingId',
      filterExpression:
        '(checkpoint = :checkpoint1 OR checkpoint = :checkpoint2) AND email = :email',
      values: {
        ':onboardingId': onboardingId,
        ':email': email,
        ':checkpoint1': OnboardingCheckpoint.INITIATED,
        ':checkpoint2': OnboardingCheckpoint.EMAIL_OTP_SENT,
      },
    };

    return queryByPkCriteria;
  }
}
