import { Body, ConflictException, Controller, Post } from '@nestjs/common';

import { ValidateEmailUsecase } from '../../usecase/validate-email.usecase';
import { EmailValidationDto } from './dto/email-validation.dto';
import { EmailStatus } from '../../domain/entity/email-status.enum';
import { v4 as uuidv4 } from 'uuid';
import { ApiCreatedResponse } from '@nestjs/swagger';
import { InjectPinoLogger } from 'nestjs-pino';
import { PinoLogger } from 'nestjs-pino';
import { ValidateEmailDto } from './dto/validate-email.dto';

@Controller('/v1/email')
export class EmailController {
  constructor(
    @InjectPinoLogger(EmailController.name)
    private readonly logger: PinoLogger,
    private readonly validateEmailUsecase: ValidateEmailUsecase,
  ) {}

  @Post('/validate')
  @ApiCreatedResponse({
    description: 'The email has been validated.',
    type: EmailValidationDto,
  })
  async validateEmail(
    @Body() validateEmailDto: ValidateEmailDto,
  ): Promise<EmailValidationDto> {
    const newObid = uuidv4();
    return this.validateEmailUsecase
      .exe(validateEmailDto.email, newObid)
      .then((statusTuple) => {
        const validatedEmail = statusTuple[0].getEmail();
        const onboardingId = statusTuple[0].getOnboardingId();
        const emailStatus = statusTuple[1];
        if (EmailStatus.ALREADY_TAKEN === emailStatus) {
          throw new ConflictException('email is already taken');
        } else {
          return EmailValidationDto.from(onboardingId, validatedEmail);
        }
      });
  }
}
