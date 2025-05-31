import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Modelos
import { User, UserSchema } from '@modules/user/models';
import { Person, PersonSchema, PersonType, PersonTypeSchema } from '@modules/person/models';

// Repositorios
import { UserRepository } from '@modules/user/repositories';
import { PersonRepository, PersonTypeRepository } from '@modules/person/repositories';

// Servicios
import { SeedService } from './seed.service';
import { PasswordService } from '@shared/services';
import { LoggerService } from '@shared/services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Person.name, schema: PersonSchema },
      { name: PersonType.name, schema: PersonTypeSchema },
    ]),
  ],
  providers: [
    SeedService,
    PasswordService,
    LoggerService,
    UserRepository,
    PersonRepository,
    PersonTypeRepository,
  ],
  exports: [SeedService],
})
export class SeedModule {}
