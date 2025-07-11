import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailController } from './controllers/v1/email.controller';
import { OtpController } from './controllers/v1/otp.controller';
import { MobileController } from './controllers/v1/mobile.controller';
import { ValidateEmailUsecase } from './usecase/validate-email.usecase';
import { OnboardingRepository } from './domain/repository/onboarding.repository';
import { SendOtpUsecase } from './usecase/send-otp.usecase';
import { ConfirmOtpUsecase } from './usecase/confirm-otp-usecase';
import { ValidateMobileUsecase } from './usecase/validate-mobile.usecase';
import { DynamoModule } from './config/dynamo/dynamo.module';
import { CustomLoggerModule } from './config/pino/custom-logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'local'}`,
    }),
    CustomLoggerModule,
    DynamoModule.forRoot(),
  ],
  controllers: [EmailController, OtpController, MobileController],
  providers: [
    ValidateEmailUsecase,
    OnboardingRepository,
    SendOtpUsecase,
    ConfirmOtpUsecase,
    ValidateMobileUsecase,
  ],
})
export class AppModule {}
