import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { ReportFiltersDto } from './dto/report-filters.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('cleaning-times')
  cleaningTimes(@CurrentUser() user: AuthenticatedUser, @Query() filters: ReportFiltersDto) {
    return this.reportsService.cleaningTimes(user.organizationId, filters);
  }

  @Get('by-area')
  byArea(@CurrentUser() user: AuthenticatedUser, @Query() filters: ReportFiltersDto) {
    return this.reportsService.byArea(user.organizationId, filters);
  }

  @Get('by-employee')
  byEmployee(@CurrentUser() user: AuthenticatedUser, @Query() filters: ReportFiltersDto) {
    return this.reportsService.byEmployee(user.organizationId, filters);
  }

  @Get('areas-without-cleaning')
  areasWithoutCleaning(@CurrentUser() user: AuthenticatedUser, @Query('date') date?: string) {
    return this.reportsService.areasWithoutCleaning(user.organizationId, date ?? new Date().toISOString());
  }

  @Get('cleaning-times/export')
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filters: ReportFiltersDto,
    @Res() res: Response,
  ) {
    const format = filters.format ?? 'xlsx';

    if (format === 'csv') {
      const csv = await this.reportsService.exportCsv(user.organizationId, filters);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-limpieza.csv"');
      res.send(csv);
      return;
    }

    if (format === 'pdf') {
      const pdf = await this.reportsService.exportPdf(user.organizationId, filters);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reporte-limpieza.pdf"');
      res.send(pdf);
      return;
    }

    const buffer = await this.reportsService.exportExcel(user.organizationId, filters);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-limpieza.xlsx"');
    res.send(buffer);
  }
}
