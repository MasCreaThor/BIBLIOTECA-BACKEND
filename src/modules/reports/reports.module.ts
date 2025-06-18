import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';
import { LoanModule } from '../loan/loan.module';
import { PersonModule } from '../person/person.module';
import { Loan, LoanSchema } from '@modules/loan/models';
import { Person, PersonSchema } from '@modules/person/models';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Loan.name, schema: LoanSchema },
      { name: Person.name, schema: PersonSchema },
    ]),
    LoanModule,
    PersonModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {} 