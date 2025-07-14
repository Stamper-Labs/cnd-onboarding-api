import {
  Body,
  Controller,
  Post,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ValidateMobileDto } from './dto/validate-mobile.dto';
import { ValidateMobileUsecase } from '../../usecase/validate-mobile.usecase';
import { MobileValidationDto } from './dto/mobile-validation.dto';
import { ApiCreatedResponse } from '@nestjs/swagger';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';

@Controller('/v1/mobile')
export class MobileController {
  constructor(
    @InjectPinoLogger(MobileController.name)
    private readonly logger: PinoLogger,
    private readonly validateMobileUsecase: ValidateMobileUsecase,
  ) {}

  @Post('/validate')
  @ApiCreatedResponse({
    description: 'The mobile has been validated.',
    type: ValidateMobileDto,
  })
  async validateEmail(
    @Headers('X-Onboarding-Id') onboardingId: string,
    @Body() validateMobileDto: ValidateMobileDto,
  ): Promise<MobileValidationDto> {
    if (!onboardingId) {
      this.logger.error(
        { onboardingId },
        'Missing required header: X-Onboarding-Id',
      );
      throw new BadRequestException('Missing required header: X-Onboarding-Id');
    }
    const result = await this.validateMobileUsecase.exe(
      onboardingId,
      validateMobileDto.mobile,
    );
    const validatedEmail = result[0].getEmail();
    const validatedMobile = result[0].getMobile();
    const validatedOnboardingId = result[0].getOnboardingId();
    return MobileValidationDto.from(
      validatedOnboardingId,
      validatedEmail,
      validatedMobile!,
    );
  }
}
