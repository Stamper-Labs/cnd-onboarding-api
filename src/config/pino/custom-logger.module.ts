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
        const logLevel: string =
          configService.get<string>('LOG_LEVEL') || 'info';
        if ('production' === environment) {
          return CustomLoggerModule.getProductionLoggingConfig(logLevel);
        } else if ('integration' === environment) {
          return CustomLoggerModule.getIntegrationLoggingConfig(logLevel);
        } else {
          return CustomLoggerModule.getLocalLoggingConfig(logLevel);
        }
      },
    }),
  ],
  exports: [LoggerModule],
})
export class CustomLoggerModule {
  private static getLocalLoggingConfig(logLevel: string) {
    return {
      pinoHttp: {
        level: logLevel,
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                singleLine: true,
                errorLikeObjectKeys: ['err'],
              },
              level: logLevel,
            },
            {
              target: 'pino-roll',
              options: {
                file: './logs/local.log',
                size: '10m',
                mkdir: true,
                limit: { count: 7 },
              },
              level: logLevel,
            },
          ],
        },
      },
    };
  }

  private static getIntegrationLoggingConfig(logLevel: string) {
    return {
      pinoHttp: {
        level: logLevel,
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                singleLine: true,
                errorLikeObjectKeys: ['err'],
              },
              level: logLevel,
            },
          ],
        },
      },
    };
  }

  private static getProductionLoggingConfig(logLevel: string) {
    return {
      pinoHttp: {
        level: logLevel,
        transport: {
          targets: [
            {
              target: 'pino-roll',
              options: {
                file: './logs/production.log',
                size: '10m',
                mkdir: true,
                limit: { count: 30 },
              },
              level: logLevel,
            },
          ],
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
