import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const environment = configService.get<string>('NODE_ENV') || 'local';
        if ('production' === environment) {
          return CustomLoggerModule.getProductionLogingConfig();
        } else {
          return CustomLoggerModule.getLocalLogingConfig();
        }
      },
    }),
  ],
  exports: [LoggerModule],
})
export class CustomLoggerModule {
  private static getLocalLogingConfig() {
    return {
      pinoHttp: {
        level: 'debug',
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                singleLine: true,
              },
              level: 'debug',
            },
            {
              target: 'pino/file',
              options: {
                destination: './logs/local.log',
                mkdir: true,
              },
              level: 'debug',
            },
          ],
        },
      },
    };
  }

  private static getProductionLogingConfig() {
    return {
      pinoHttp: {
        level: 'info',
        transport: {
          target: 'pino/file',
          options: {
            destination: './logs/production.log',
            mkdir: true,
          },
        },
      },
    };
  }

  private static getBaseHttpLoggingConfig() {
    return {
      serializers: {
        req: () => undefined,
      },
      customProps: (req: Request) => ({
        http: {
          method: req.method,
          url: req.url,
          id: req.id,
        },
      }),
    };
  }
}
