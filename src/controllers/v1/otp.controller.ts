import {
  Body,
  Headers,
  Controller,
  Post,
  BadRequestException,
  PreconditionFailedException,
  Query,
} from '@nestjs/common';
import { SendOtpUsecase } from '../../usecase/send-otp.usecase';
import { OtpRecipientDto } from './dto/otp-recipient.dto';
import { ValidateOtpDto } from './dto/validate-otp.dto';
import { ConfirmOtpUsecase } from '../../usecase/confirm-otp-usecase';
import { ApiNoContentResponse } from '@nestjs/swagger';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { ChannelDto } from './dto/channel.dto';
import { isEmail } from 'class-validator';
import { Channel } from 'src/domain/entity/channel.enum';

@Controller('/v1/otp')
export class OtpController {
  constructor(
    @InjectPinoLogger(OtpController.name)
    private readonly logger: PinoLogger,
    private readonly sendOtplUsecase: SendOtpUsecase,
    private readonly confirmOtpUsecase: ConfirmOtpUsecase,
  ) {}

  @Post('/send')
  @ApiNoContentResponse({
    description: 'The otp has been sent for email confirmation.',
  })
  async sendOtp(
    @Headers('X-Onboarding-Id') onboardingId: string,
    @Query() channelDto: ChannelDto,
    @Body() otpRecipientDto: OtpRecipientDto,
  ): Promise<void> {
    this.curateSendRequest(onboardingId, channelDto, otpRecipientDto);
    try {
      await this.sendOtplUsecase.exe(
        channelDto.channel,
        otpRecipientDto.value,
        onboardingId,
      );
    } catch (error) {
      this.logger.error(
        { onboardingId },
        `Failed to send OTP for email: ${otpRecipientDto.value}`,
        error,
      );
      throw new PreconditionFailedException('Failed to send OTP');
    }
  }

  private curateSendRequest(
    onboardingId: string,
    channelDto: ChannelDto,
    otpRecipientDto: OtpRecipientDto,
  ) {
    if (!onboardingId) {
      this.logger.error(
        { onboardingId },
        'Missing required header: X-Onboarding-Id',
      );
      throw new BadRequestException('Missing required header: X-Onboarding-Id');
    }
    if (Channel.EMAIL === channelDto.channel) {
      if (!isEmail(otpRecipientDto.value)) {
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
      if (!isEmail(otpRecipientDto.value)) {
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

  @Post('/confirm')
  @ApiNoContentResponse({
    description: 'The otp has been confirmed.',
  })
  async validateOtp(
    @Headers('X-Onboarding-Id') onboardingId: string,
    @Body() validateOtpDto: ValidateOtpDto,
  ): Promise<void> {
    if (!onboardingId) {
      this.logger.error(
        { onboardingId },
        'Missing required header: X-Onboarding-Id',
      );
      throw new BadRequestException('Missing required header: X-Onboarding-Id');
    }
    const result = await this.confirmOtpUsecase.exe(
      validateOtpDto.email,
      validateOtpDto.otp,
      onboardingId,
    );
    if (!result) {
      this.logger.error(
        { onboardingId },
        `Invalid OTP for email: ${validateOtpDto.email}`,
      );
      throw new PreconditionFailedException('Invalid OTP');
    } else {
      this.logger.info(
        { onboardingId },
        `OTP validated successfully for email: ${validateOtpDto.email}`,
      );
    }
  }
}
