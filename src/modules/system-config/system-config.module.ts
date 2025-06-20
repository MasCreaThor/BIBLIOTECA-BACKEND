import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SystemConfigController } from './controllers';
import { SystemConfigService, SystemConfigInitService } from './services';
import { SystemConfigRepository } from './repositories';
import { SystemConfig, SystemConfigSchema } from './models';

import { LoggerService } from '@shared/services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SystemConfig.name, schema: SystemConfigSchema },
    ]),
  ],
  controllers: [SystemConfigController],
  providers: [
    SystemConfigService,
    SystemConfigInitService,
    SystemConfigRepository,
    LoggerService,
  ],
  exports: [SystemConfigService, SystemConfigRepository],
})
export class SystemConfigModule {} 