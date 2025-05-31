import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Modelos
import { User, UserSchema } from '@models/user.model';
import { Person, PersonSchema } from '@models/person.model';
import { PersonType, PersonTypeSchema } from '@models/person-type.model';

// Repositorios
import { UserRepository } from '@repositories/user.repository';
import { PersonRepository } from '@repositories/person.repository';
import { PersonTypeRepository } from '@repositories/person-type.repository';

// Servicios
import { SeedService } from './seed.service';
import { PasswordService } from '@services/password.service';
import { LoggerService } from '@common/services/logger.service';

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