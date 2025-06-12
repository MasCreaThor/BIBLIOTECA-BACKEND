// src/modules/loan/loan.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Controladores
import {
  LoanController,
  ReturnController,
  OverdueController,
} from './controllers';

// Servicios
import {
  LoanService,
  ReturnService,
  OverdueService,
  LoanValidationService,
} from './services';

// Repositorios
import {
  LoanRepository,
  LoanStatusRepository,
} from './repositories';

// Modelos
import {
  Loan,
  LoanSchema,
  LoanStatus,
  LoanStatusSchema,
} from './models';

// Seeds
import { LoanSeedService } from './seeds/loan-seed.service';

// Servicios compartidos
import { LoggerService } from '@shared/services';

// Repositorios de otros módulos necesarios
import { PersonRepository, PersonTypeRepository } from '@modules/person/repositories';
import { Person, PersonSchema, PersonType, PersonTypeSchema } from '@modules/person/models';
import { ResourceRepository, ResourceStateRepository } from '@modules/resource/repositories';
import { Resource, ResourceSchema, ResourceState, ResourceStateSchema } from '@modules/resource/models';

@Module({
  imports: [
    MongooseModule.forFeature([
      // Modelos del módulo loan
      { name: Loan.name, schema: LoanSchema },
      { name: LoanStatus.name, schema: LoanStatusSchema },
      
      // Modelos de otros módulos necesarios para referencias
      { name: Person.name, schema: PersonSchema },
      { name: PersonType.name, schema: PersonTypeSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: ResourceState.name, schema: ResourceStateSchema },
    ]),
  ],
  controllers: [
    LoanController,
    ReturnController,
    OverdueController,
  ],
  providers: [
    // Servicios del módulo
    LoanService,
    ReturnService,
    OverdueService,
    LoanValidationService,

    // Repositorios del módulo
    LoanRepository,
    LoanStatusRepository,

    // Repositorios de otros módulos
    PersonRepository,
    PersonTypeRepository,
    ResourceRepository,
    ResourceStateRepository,

    // Seeds
    LoanSeedService,

    // Servicios compartidos
    LoggerService,
  ],
  exports: [
    // Servicios principales para otros módulos
    LoanService,
    ReturnService,
    OverdueService,
    LoanValidationService,

    // Repositorios para casos específicos
    LoanRepository,
    LoanStatusRepository,

    // Seeds para el sistema principal
    LoanSeedService,
  ],
})
export class LoanModule {}