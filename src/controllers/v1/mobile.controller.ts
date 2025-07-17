import {
  Body,
  Controller,
  Post,
  Headers,
  BadRequestException,
  ConflictException,
  PreconditionFailedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ValidateMobileDto } from './dto/validate-mobile.dto';
import { ValidateMobileUsecase } from '../../usecase/validate-mobile.usecase';
import { MobileValidationDto } from './dto/mobile-validation.dto';
import { ApiCreatedResponse } from '@nestjs/swagger';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { MobileStatus } from 'src/domain/entity/mobile-status.enum';
import { OnboardingRuleViolationError } from 'src/domain/error/onboarding-rule-violation.error';
import { ErrorUtilsService } from 'src/domain/service/error-utils.service';
import { ErrorObject } from 'src/domain/entity/error-object';

@Controller('/v1/mobile')
export class MobileController {
  constructor(
    @InjectPinoLogger(MobileController.name)
    private readonly logger: PinoLogger,
    private readonly validateMobileUsecase: ValidateMobileUsecase,
  ) {}

  @Post('/validate')
  @ApiCreatedResponse({
    description: `Validates whether the provided mobile number is available,
    by verifying that the associated onboarding has a previously confirmed email via OTP.`,
    type: ValidateMobileDto,
  })
  async validateEmail(
    @Headers('X-Onboarding-Id') onboardingId: string,
    @Body() validateMobileDto: ValidateMobileDto,
  ): Promise<MobileValidationDto> {
    this.curateRequest(onboardingId);
    this.logger.info({ onboardingId }, 'Mobile validation started.');

    try {
      const [onboarding, mobileStatus] = await this.validateMobileUsecase.exe(
        onboardingId,
        validateMobileDto.mobile,
      );
      if (MobileStatus.ALREADY_TAKEN === mobileStatus) {
        this.logger.error(
          { onboardingId },
          `Mobile ${validateMobileDto.mobile} is already in use by onboardingId: ${onboarding.getOnboardingId()}.`,
        );
        throw new ConflictException('Email is already taken.');
      } else {
        this.logger.info(
          {
            onboardingId: onboarding.getOnboardingId(),
          },
          `Mobile validation completed. The mobile ${validateMobileDto.mobile} is available.`,
        );
        return MobileValidationDto.from(
          onboarding.getOnboardingId(),
          onboarding.getEmail(),
          onboarding.getMobile()!,
        );
      }
    } catch (error: unknown) {
      const [safeError, serializedErrorObject]: [Error, ErrorObject] =
        ErrorUtilsService.normalizeError(error);
      if (safeError instanceof OnboardingRuleViolationError) {
        this.logger.error(
          { onboardingId, err: serializedErrorObject },
          `Mobile validation for ${validateMobileDto.mobile} failed due to an onboarding rule violation: ${serializedErrorObject.message}`,
        );
        throw new PreconditionFailedException(
          `Mobile validation for ${validateMobileDto.mobile} failed due to an onboarding rule violation: ${serializedErrorObject.message}`,
        );
      } else {
        this.logger.error(
          { onboardingId, err: serializedErrorObject },
          `Unexpected error while validating email: ${validateMobileDto.mobile}: ${serializedErrorObject.message}`,
        );
        throw new InternalServerErrorException(
          'Unexpected error while validating email.',
        );
      }
    }
  }

  private curateRequest(onboardingId: string) {
    if (!onboardingId) {
      this.logger.error(
        { onboardingId },
        'Missing required header: X-Onboarding-Id',
      );
      throw new BadRequestException('Missing required header: X-Onboarding-Id');
    }
  }
}
