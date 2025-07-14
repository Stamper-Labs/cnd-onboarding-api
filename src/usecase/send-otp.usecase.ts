import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import { OnboardingRepository } from '../domain/repository/onboarding.repository';
import { OnboardingCheckpoint } from 'src/domain/entity/onboarding-checkpoint.enum';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { PrimaryKeyCriteria } from 'src/domain/repository/criteria/primary-key.criteria';
import { Channel } from 'src/domain/entity/channel.enum';

@Injectable()
export class SendOtpUsecase {
  private readonly TABLE_NAME: string = 'cnd-onboarding-api-tb';

  constructor(
    @InjectPinoLogger(SendOtpUsecase.name)
    private readonly logger: PinoLogger,
    private readonly onboardingRepository: OnboardingRepository,
  ) {}

  async exe(
    channel: Channel,
    otpRecipient: string,
    onboardingId: string,
  ): Promise<string> {
    this.logger.info(
      { onboardingId },
      `Start to send the otp to ${otpRecipient} by channel: ${channel}`,
    );

    if (Channel.EMAIL === channel) {
      const queryExpressionForEmail = this.buildPrimaryKeyCriteriaForEmail(
        onboardingId,
        otpRecipient,
      );
      const onboardingFound = await this.onboardingRepository.findByPk(
        queryExpressionForEmail,
      );
      if (!onboardingFound) {
        this.logger.error(
          { onboardingId },
          `Cannot send OTP, the email ${otpRecipient} was not found in our records.`,
        );
        throw new Error('Cannot send OTP, the email has not been validated.');
      } else {
        const otp = authenticator.generate(onboardingFound.getOnboardingId());
        this.logger.info(
          { onboardingId },
          `OTP ${otp} has been sucessfully generated for email: ${otpRecipient}`,
        );
        // TODO send OTP vial email
        this.logger.info(
          { onboardingId },
          `OTP ${otp} has been sent to: ${otpRecipient}`,
        );
        return otp;
      }
    } else {
      const queryExpressionForMobile = this.buildPrimaryKeyCriteriaForMobile(
        onboardingId,
        otpRecipient,
      );
      const onboardingFound = await this.onboardingRepository.findByPk(
        queryExpressionForMobile,
      );
      if (!onboardingFound) {
        this.logger.error(
          { onboardingId },
          `Cannot send OTP, the mobile ${otpRecipient} was not found in our records.`,
        );
        throw new Error('Cannot send OTP, the email has not been validated.');
      } else {
        const otp = authenticator.generate(onboardingFound.getOnboardingId());
        this.logger.info(
          { onboardingId },
          `OTP ${otp} has been sucessfully generated for mobile: ${otpRecipient}`,
        );
        // TODO send OTP via SMS
        this.logger.info(
          { onboardingId },
          `OTP ${otp} has been sent to: ${otpRecipient}`,
        );
        return otp;
      }
    }
  }

  private buildPrimaryKeyCriteriaForEmail(
    onboardingId: string,
    email: string,
  ): PrimaryKeyCriteria {
    this.logger.info(
      { onboardingId },
      'Building primary key criteria to look for onbarding by email and checkpoint. ',
    );
    const queryByPkCriteria: PrimaryKeyCriteria = {
      primaryKeyExpression: 'onboardingId = :onboardingId',
      filterExpression: 'checkpoint = :checkpoint AND email = :email',
      values: {
        ':onboardingId': onboardingId,
        ':email': email,
        ':checkpoint': OnboardingCheckpoint.INITIATED,
      },
    };
    return queryByPkCriteria;
  }

  private buildPrimaryKeyCriteriaForMobile(
    onboardingId: string,
    mobile: string,
  ): PrimaryKeyCriteria {
    this.logger.info(
      { onboardingId },
      'Building primary key criteria to look for onbarding by mobile and checkpoint. ',
    );
    const queryByPkCriteria: PrimaryKeyCriteria = {
      primaryKeyExpression: 'onboardingId = :onboardingId',
      filterExpression: 'checkpoint = :checkpoint AND mobile = :mobile',
      values: {
        ':onboardingId': onboardingId,
        ':mobile': mobile,
        ':checkpoint': OnboardingCheckpoint.EMAIL_CONFIRMED,
      },
    };
    return queryByPkCriteria;
  }
}
