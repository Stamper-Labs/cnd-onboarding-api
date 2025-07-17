import {
  Body,
  ConflictException,
  Controller,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';

import { ValidateEmailUsecase } from '../../usecase/validate-email.usecase';
import { EmailValidationDto } from './dto/email-validation.dto';
import { EmailStatus } from '../../domain/entity/email-status.enum';
import { v4 as uuidv4 } from 'uuid';
import { ApiCreatedResponse } from '@nestjs/swagger';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { ValidateEmailDto } from './dto/validate-email.dto';
import { ErrorUtilsService } from 'src/domain/service/error-utils.service';

@Controller('/v1/email')
export class EmailController {
  constructor(
    @InjectPinoLogger(EmailController.name)
    private readonly logger: PinoLogger,
    private readonly validateEmailUsecase: ValidateEmailUsecase,
  ) {}

  @Post('/validate')
  @ApiCreatedResponse({
    description: `Validates whether the provided email is available. 
      If it is, creates a new onboarding in the database associated with that email,
      and returns the onboardingId for future use.`,
    type: EmailValidationDto,
  })
  async validateEmail(
    @Body() validateEmailDto: ValidateEmailDto,
  ): Promise<EmailValidationDto> {
    const newObid = uuidv4();
    this.logger.info(
      { onboardingId: newObid, email: validateEmailDto.email },
      'Email validation started.',
    );
    return this.validateEmailUsecase
      .exe(validateEmailDto.email, newObid)
      .then((statusTuple) => {
        const [onboarding, emailStatus] = statusTuple;
        if (EmailStatus.ALREADY_TAKEN === emailStatus) {
          this.logger.error(
            { onboardingId: newObid, email: validateEmailDto.email },
            `Email ${validateEmailDto.email} is already in use by onboardingId: ${onboarding.getOnboardingId()}.`,
          );
          throw new ConflictException('Email is already taken.');
        } else {
          this.logger.info(
            {
              onboardingId: onboarding.getOnboardingId(),
              email: onboarding.getEmail(),
            },
            `Email validation completed. The email ${validateEmailDto.email} is available.`,
          );
          return EmailValidationDto.from(
            onboarding.getOnboardingId(),
            onboarding.getEmail(),
          );
        }
      })
      .catch((error: unknown) => {
        const [, serializedErrorObject] =
          ErrorUtilsService.normalizeError(error);
        this.logger.error(
          {
            onboardingId: newObid,
            email: validateEmailDto.email,
            err: serializedErrorObject,
          },
          `Unexpected error while validating email: ${validateEmailDto.email}. ${serializedErrorObject.message}. `,
        );
        throw new InternalServerErrorException(
          'Unexpected error while validating email.',
        );
      });
  }
}
