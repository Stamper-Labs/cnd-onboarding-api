import {
  Body,
  Headers,
  Controller,
  Post,
  BadRequestException,
  PreconditionFailedException,
  Query,
  HttpCode,
  NotImplementedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SendEmailOtpUsecase } from '../../usecase/send-email-otp.usecase';
import { SendOtpDto } from './dto/send-otp.dto';
import { ConfirmOtpDto } from './dto/confirm-otp.dto';
import { ConfirmEmailOtpUsecase } from '../../usecase/confirm-email-otp-usecase';
import { ApiNoContentResponse } from '@nestjs/swagger';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { ChannelDto } from './dto/channel.dto';
import { isEmail, isNumberString } from 'class-validator';
import { Channel } from 'src/domain/entity/channel.enum';
import { OnboardingRuleViolationError } from 'src/domain/error/onboarding-rule-violation.error';
import { Onboarding } from 'src/domain/entity/onboarding';
import { ErrorUtilsService } from 'src/domain/service/error-utils.service';
import { ErrorObject } from 'src/domain/entity/error-object';
import { SendMobileOtpUsecase } from 'src/usecase/send-mobile-otp.usecase';

@Controller('/v1/otp')
export class OtpController {
  constructor(
    @InjectPinoLogger(OtpController.name)
    private readonly logger: PinoLogger,
    private readonly sendEmailOtplUsecase: SendEmailOtpUsecase,
    private readonly sendMobileOtplUsecase: SendMobileOtpUsecase,
    private readonly confirmEmailOtpUsecase: ConfirmEmailOtpUsecase,
  ) {}

  @Post('/send')
  @HttpCode(204)
  @ApiNoContentResponse({
    description:
      'Generates and send an OTP to a reciepent given a channel for further confirmation.',
  })
  async sendOtp(
    @Headers('X-Onboarding-Id') onboardingId: string,
    @Query() channelDto: ChannelDto,
    @Body() sendOtpDto: SendOtpDto,
  ): Promise<void> {
    this.curateSendRequest(onboardingId, channelDto, sendOtpDto);
    this.logger.info(
      { onboardingId },
      `Sending OTP to ${sendOtpDto.recipient} via ${channelDto.channel} started.`,
    );

    if (Channel.EMAIL === channelDto.channel) {
      try {
        await this.sendEmailOtplUsecase.exe(sendOtpDto.recipient, onboardingId);
        this.logger.info(
          { onboardingId },
          `Sending OTP to ${sendOtpDto.recipient} completed.`,
        );
      } catch (error) {
        const [safeError, serializedErrorObject]: [Error, ErrorObject] =
          ErrorUtilsService.normalizeError(error);
        if (safeError instanceof OnboardingRuleViolationError) {
          this.logger.error(
            { onboardingId, err: serializedErrorObject },
            `Sending OTP to ${sendOtpDto.recipient} failed due to an onboarding rule violation: ${serializedErrorObject.message}`,
          );
          throw new PreconditionFailedException(
            `Sending OTP to ${sendOtpDto.recipient} failed due to an onboarding rule violation: ${serializedErrorObject.message}`,
          );
        } else {
          this.logger.error(
            { onboardingId, err: serializedErrorObject },
            `Unexpected error while sending OTP to: ${sendOtpDto.recipient}: ${serializedErrorObject.message}`,
          );
          throw new InternalServerErrorException(
            'Unexpected error while sending OTP to receipent.',
          );
        }
      }
    } else if (Channel.MOBILE === channelDto.channel) {
      try {
        await this.sendMobileOtplUsecase.exe(
          sendOtpDto.recipient,
          onboardingId,
        );
        this.logger.info(
          { onboardingId },
          `Sending OTP to ${sendOtpDto.recipient} completed.`,
        );
      } catch (error: unknown) {
        const [safeError, serializedErrorObject]: [Error, ErrorObject] =
          ErrorUtilsService.normalizeError(error);
        if (safeError instanceof OnboardingRuleViolationError) {
          this.logger.error(
            { onboardingId, err: serializedErrorObject },
            `Sending OTP to ${sendOtpDto.recipient} failed due to an onboarding rule violation: ${serializedErrorObject.message}`,
          );
          throw new PreconditionFailedException(
            `Sending OTP to ${sendOtpDto.recipient} failed due to an onboarding rule violation: ${serializedErrorObject.message}`,
          );
        } else {
          this.logger.error(
            { onboardingId, err: serializedErrorObject },
            `Unexpected error while sending OTP to: ${sendOtpDto.recipient}: ${serializedErrorObject.message}`,
          );
          throw new InternalServerErrorException(
            'Unexpected error while sending OTP to receipent.',
          );
        }
      }
    }
  }

  @Post('/confirm')
  @HttpCode(204)
  @ApiNoContentResponse({
    description:
      'Confirms an OTP previously sent to a recipient via a channel.',
  })
  async confirmOtp(
    @Headers('X-Onboarding-Id') onboardingId: string,
    @Query() channelDto: ChannelDto,
    @Body() confirmOtpDto: ConfirmOtpDto,
  ): Promise<void> {
    this.curateConfirmRequest(onboardingId, channelDto, confirmOtpDto);
    this.logger.info(
      { onboardingId },
      `OTP confirmation for recepient ${confirmOtpDto.recipient} via ${channelDto.channel} started.`,
    );
    if (Channel.EMAIL === channelDto.channel) {
      try {
        const onboardingWithEmailOtpConfirmed: Onboarding =
          await this.confirmEmailOtpUsecase.exe(
            onboardingId,
            confirmOtpDto.recipient,
            confirmOtpDto.otp,
          );
        this.logger.info(
          { onboardingId },
          `OTP sucessfully confirmed for email: ${onboardingWithEmailOtpConfirmed.getEmail()}`,
        );
      } catch (error) {
        const [safeError, serializedErrorObject]: [Error, ErrorObject] =
          ErrorUtilsService.normalizeError(error);
        if (safeError instanceof OnboardingRuleViolationError) {
          this.logger.error(
            { onboardingId, err: serializedErrorObject },
            `Failed to confirm OTP sent to ${confirmOtpDto.recipient} due to an onboarding rule violation: ${serializedErrorObject.message}`,
          );
          throw new PreconditionFailedException(
            `Failed to confirm OTP sent to ${confirmOtpDto.recipient} due to an onboarding rule violation: ${serializedErrorObject.message}`,
          );
        } else {
          this.logger.error(
            { onboardingId, err: serializedErrorObject },
            `Unexpected error during OTP confirmation: ${confirmOtpDto.recipient}: ${serializedErrorObject.message}`,
          );
          throw new InternalServerErrorException(
            'Unexpected error during OTP confirmation.',
          );
        }
      }
    } else {
      this.logger.error(
        { onboardingId },
        `OTP confirmation not supported for channel: ${channelDto.channel}`,
      );
      throw new NotImplementedException(
        'OTP confirmation is not yet supported for channels other than email.',
      );
    }
  }

  private curateSendRequest(
    onboardingId: string,
    channelDto: ChannelDto,
    sendOtpDto: SendOtpDto,
  ) {
    if (!onboardingId) {
      this.logger.error(
        { onboardingId },
        'Missing required header: X-Onboarding-Id',
      );
      throw new BadRequestException('Missing required header: X-Onboarding-Id');
    }
    if (Channel.EMAIL === channelDto.channel) {
      if (!isEmail(sendOtpDto.recipient)) {
        this.logger.error(
          { onboardingId },
          'Invalid email format provided for otp receiver value field',
        );
        throw new BadRequestException(
          'The provided otp receiver is not a valid email address.',
        );
      }
    }
    if (Channel.MOBILE === channelDto.channel) {
      if (!isNumberString(sendOtpDto.recipient)) {
        this.logger.error(
          { onboardingId },
          'Invalid mobile format provided for otp receiver value field',
        );
        throw new BadRequestException(
          'The provided otp receiver is not a valid mobile address.',
        );
      }
    }
  }

  private curateConfirmRequest(
    onboardingId: string,
    channelDto: ChannelDto,
    confirmOtpDto: ConfirmOtpDto,
  ) {
    if (!onboardingId) {
      this.logger.error(
        { onboardingId },
        'Missing required header: X-Onboarding-Id',
      );
      throw new BadRequestException('Missing required header: X-Onboarding-Id');
    }
    if (Channel.EMAIL === channelDto.channel) {
      if (!isEmail(confirmOtpDto.recipient)) {
        this.logger.error(
          { onboardingId },
          'Invalid email format provided for otp recipient field',
        );
        throw new BadRequestException(
          'The provided otp recipient is not a valid email address.',
        );
      }
    }
    if (Channel.MOBILE === channelDto.channel) {
      if (!isEmail(confirmOtpDto.recipient)) {
        this.logger.error(
          { onboardingId },
          'Invalid mobile format provided for otp recepient value field',
        );
        throw new BadRequestException(
          'The provided otp recepient is not a valid mobile address.',
        );
      }
    }
  }
}
