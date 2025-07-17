import { IsNumberString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmOtpDto {
  @ApiProperty({
    description: 'The email or the mobile where the OTP was previously sent.',
    examples: {
      email: {
        summary: 'Email address',
        value: 'mcwiise@mailinator.com',
      },
      mobile: {
        summary: 'Mobile number',
        value: '3186666666',
      },
    },
  })
  recipient: string;

  @ApiProperty({
    example: '123456',
    description: 'The otp to confirm the email or mobile',
  })
  @IsNumberString()
  otp: string;
}
