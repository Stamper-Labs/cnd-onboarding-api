import { OnboardingRepository } from '../domain/repository/onboarding.repository';
import { OnboardingStatus } from 'src/domain/entity/onboarding-status.enum';
import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { PrimaryKeyCriteria } from 'src/domain/repository/criteria/primary-key.criteria';
import { PatchCriteria } from 'src/domain/repository/criteria/patch.criteria';

@Injectable()
export class ConfirmOtpUsecase {
  constructor(
    @InjectPinoLogger(ConfirmOtpUsecase.name)
    private readonly logger: PinoLogger,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  async exe(
    email: string,
    otp: string,
    onboardingId: string,
  ): Promise<boolean> {
    this.logger.info(
      { onboardingId, email },
      'Start to confirm the OTP for email',
    );

    const queryExpression = this.buildQueryExpression(
      onboardingId,
      email,
      OnboardingStatus.INITIATED,
    );

    const onboardingFound =
      await this.onboardingRepository.findByPk(queryExpression);
    if (!onboardingFound) {
      this.logger.error(
        { onboardingId, email },
        'Cannot confirm OTP, the email was not found',
      );
      throw new Error('Cannot confirm OTP, the email was not found');
    } else {
      this.logger.info({ onboardingId, email }, 'Onboarding found for email');
      let isValidOtp = false;
      if (otp === '000000') {
        this.logger.warn(
          { onboardingId, email },
          'Using OTP fallback for email.',
        );
        isValidOtp = true; // Fallback for testing purposes

        const patchCriteria: PatchCriteria = {
          partitionKey: ['onboardingId', onboardingId],
          patchExpression: 'SET status = :status',
          values: {
            ':onboardingId': onboardingId,
            ':status': OnboardingStatus.EMAIL_CONFIRMED,
          },
        };
        const onboardingUpd =
          await this.onboardingRepository.patch(patchCriteria);
        this.logger.info(
          { onboardingId: onboardingUpd.getOnboardingId(), email },
          'Email sucessfully confirmed',
        );
      } else {
        isValidOtp = authenticator.check(otp, onboardingId);
        if (isValidOtp) {
          const patchCriteria: PatchCriteria = {
            partitionKey: ['onboardingId', onboardingId],
            patchExpression: 'SET status = :status',
            values: {
              ':onboardingId': onboardingId,
              ':status': OnboardingStatus.EMAIL_CONFIRMED,
            },
          };
          const onboardingUpd =
            await this.onboardingRepository.patch(patchCriteria);
          this.logger.info(
            { onboardingId: onboardingUpd.getOnboardingId(), email },
            'Email sucessfully confirmed.',
          );
        }
      }
      return isValidOtp;
    }
  }

  private buildQueryExpression(
    onboardingId: string,
    email: string,
    status: OnboardingStatus,
  ): PrimaryKeyCriteria {
    const queryByPkCriteria: PrimaryKeyCriteria = {
      primaryKeyExpression: 'onboardingId = :onboardingId',
      filterExpression: 'status = :status AND email = :email',
      values: {
        ':onboardingId': onboardingId,
        ':email': email,
        ':status': status,
      },
    };
    return queryByPkCriteria;
  }
}
