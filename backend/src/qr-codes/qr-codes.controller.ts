import { Controller, Get, Param, Post, Body, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { QrCodesService } from './qr-codes.service';
import { ResolveQrDto } from './dto/resolve-qr.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class QrCodesController {
  constructor(private readonly qrCodesService: QrCodesService) {}

  @Post('areas/:areaId/qr-codes')
  @Roles(RoleName.ADMIN)
  generate(@CurrentUser() user: AuthenticatedUser, @Param('areaId') areaId: string) {
    return this.qrCodesService.generate(user.organizationId, user.userId, areaId);
  }

  @Get('areas/:areaId/qr-codes')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  history(@CurrentUser() user: AuthenticatedUser, @Param('areaId') areaId: string) {
    return this.qrCodesService.history(user.organizationId, areaId);
  }

  @Get('qr-codes/:id/png')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  async png(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Res() res: Response) {
    const buffer = await this.qrCodesService.renderPng(user.organizationId, id);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="qr-${id}.png"`);
    res.send(buffer);
  }

  @Post('qr-codes/resolve')
  resolve(@CurrentUser() user: AuthenticatedUser, @Body() dto: ResolveQrDto) {
    return this.qrCodesService.resolve(user.organizationId, dto.token);
  }
}
