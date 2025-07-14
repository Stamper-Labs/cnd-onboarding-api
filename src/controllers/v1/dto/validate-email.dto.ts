import { ApiProperty } from '@nestjs/swagger';

export class ValidateEmailDto {
  @ApiProperty()
  email: string;
}
