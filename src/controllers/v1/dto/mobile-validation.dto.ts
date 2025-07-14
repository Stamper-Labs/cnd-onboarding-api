import { ApiProperty } from '@nestjs/swagger';

export class MobileValidationDto {
  @ApiProperty()
  onboardingId: string;
  @ApiProperty()
  email: string;
  @ApiProperty()
  mobile: string;

  static from(
    onboardingId: string,
    email: string,
    mobile: string,
  ): MobileValidationDto {
    return { onboardingId, email, mobile } as MobileValidationDto;
  }
}
