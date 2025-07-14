import { ApiProperty } from '@nestjs/swagger';

export class EmailValidationDto {
  @ApiProperty()
  onboardingId: string;
  @ApiProperty()
  email: string;

  static from(onboardingId: string, email: string): EmailValidationDto {
    return { onboardingId, email } as EmailValidationDto;
  }
}
