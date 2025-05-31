import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PersonController } from './controllers';
import { PersonService } from './services';
import { PersonRepository, PersonTypeRepository } from './repositories';
import { Person, PersonSchema, PersonType, PersonTypeSchema } from './models';

import { LoggerService } from '@shared/services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Person.name, schema: PersonSchema },
      { name: PersonType.name, schema: PersonTypeSchema },
    ]),
  ],
  controllers: [PersonController],
  providers: [
    PersonService,
    PersonRepository,
    PersonTypeRepository,
    LoggerService,
  ],
  exports: [PersonService, PersonRepository, PersonTypeRepository],
})
export class PersonModule {}
