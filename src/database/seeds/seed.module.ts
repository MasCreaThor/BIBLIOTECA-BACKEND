// src/database/seeds/seed.module.ts - ACTUALIZADO
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Modelos
import { User, UserSchema } from '@modules/user/models';
import { Person, PersonSchema, PersonType, PersonTypeSchema } from '@modules/person/models';
import { 
  Resource, 
  ResourceSchema,
  ResourceType, 
  ResourceTypeSchema,
  Category, 
  CategorySchema,
  Author, 
  AuthorSchema,
  Publisher, 
  PublisherSchema,
  ResourceState, 
  ResourceStateSchema,
  Location, 
  LocationSchema 
} from '@modules/resource/models';
import { Loan, LoanSchema, LoanStatus, LoanStatusSchema } from '@modules/loan/models'; // NUEVO

// Repositorios
import { UserRepository } from '@modules/user/repositories';
import { PersonRepository, PersonTypeRepository } from '@modules/person/repositories';
import { 
  ResourceRepository,
  CategoryRepository,
  LocationRepository,
  AuthorRepository,
  PublisherRepository,
  ResourceTypeRepository,
  ResourceStateRepository 
} from '@modules/resource/repositories';
import { LoanRepository, LoanStatusRepository } from '@modules/loan/repositories'; // NUEVO

// Servicios
import { SeedService } from './seed.service';
import { ResourceSeedService } from '../../modules/resource/seeds/resource-seed.service';
import { LoanSeedService } from '../../modules/loan/seeds/loan-seed.service'; // NUEVO
import { PasswordService } from '@shared/services';
import { LoggerService } from '@shared/services';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Person.name, schema: PersonSchema },
      { name: PersonType.name, schema: PersonTypeSchema },
      { name: Resource.name, schema: ResourceSchema },
      { name: ResourceType.name, schema: ResourceTypeSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Author.name, schema: AuthorSchema },
      { name: Publisher.name, schema: PublisherSchema },
      { name: ResourceState.name, schema: ResourceStateSchema },
      { name: Location.name, schema: LocationSchema },
      { name: Loan.name, schema: LoanSchema }, // NUEVO
      { name: LoanStatus.name, schema: LoanStatusSchema }, // NUEVO
    ]),
  ],
  providers: [
    SeedService,
    ResourceSeedService,
    LoanSeedService, // NUEVO
    PasswordService,
    LoggerService,
    UserRepository,
    PersonRepository,
    PersonTypeRepository,
    ResourceRepository,
    CategoryRepository,
    LocationRepository,
    AuthorRepository,
    PublisherRepository,
    ResourceTypeRepository,
    ResourceStateRepository,
    LoanRepository, // NUEVO
    LoanStatusRepository, // NUEVO
  ],
  exports: [SeedService, ResourceSeedService, LoanSeedService], // ACTUALIZADO
})
export class SeedModule {}