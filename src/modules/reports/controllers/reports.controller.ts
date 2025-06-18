import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { ReportsService, PersonLoanSummary } from '../services/reports.service';
import { PersonLoansQueryDto, UpdateLoanStatusDto, UpdateMultipleLoanStatusDto } from '../dto/reports.dto';
import { AuthGuard } from '../../../shared/guards';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('person-loans')
  async getPersonLoans(@Query() query: PersonLoansQueryDto): Promise<PersonLoanSummary[]> {
    return this.reportsService.getPersonLoans(query);
  }

  @Put('update-loan-status')
  async updateLoanStatus(@Body() updateDto: UpdateLoanStatusDto): Promise<{ message: string }> {
    await this.reportsService.updateLoanStatus(updateDto);
    return { message: 'Estado del préstamo actualizado correctamente' };
  }

  @Put('update-multiple-loan-status')
  async updateMultipleLoanStatus(@Body() updateDto: UpdateMultipleLoanStatusDto): Promise<{ message: string }> {
    await this.reportsService.updateMultipleLoanStatus(updateDto);
    return { message: 'Estados de préstamos actualizados correctamente' };
  }
} 