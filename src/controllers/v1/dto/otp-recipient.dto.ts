import { ApiProperty } from '@nestjs/swagger';

export class OtpRecipientDto {
  @ApiProperty({
    description: 'The email or the mobile to send the OTP to',
    examples: {
      email: {
        summary: 'Email address',
        value: 'mcwiise@mailinator.com',
      },
      phone: {
        summary: 'Phone number',
        value: '3186666666',
      },
    },
  })
  value: string;
}
