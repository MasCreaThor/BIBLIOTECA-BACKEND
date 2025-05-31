import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Modelos
import { Person, PersonSchema } from '@models/person.model';
import { PersonType, PersonTypeSchema } from '@models/person-type.model';

// Repositorios
import { PersonRepository } from '@repositories/person.repository';
import { PersonTypeRepository } from '@repositories/person-type.repository';

// Servicios
import { PersonService } from '@services/person.service';
import { LoggerService } from '@common/services/logger.service';

// Controladores
import { PersonController } from '@controllers/person.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Person.name, schema: PersonSchema },
      { name: PersonType.name, schema: PersonTypeSchema },
    ]),
  ],
  controllers: [PersonController],
  providers: [
    // Servicios
    PersonService,
    LoggerService,

    // Repositorios
    PersonRepository,
    PersonTypeRepository,
  ],
  exports: [
    // Exportar servicios para usar en otros módulos
    PersonService,
    PersonRepository,
    PersonTypeRepository,
  ],
})
export class PersonModule {}