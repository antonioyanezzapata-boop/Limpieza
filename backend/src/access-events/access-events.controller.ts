import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AccessEventsService } from './access-events.service';
import { RegisterEventDto } from './dto/register-event.dto';
import { CorrectSessionDto } from './dto/correct-session.dto';

@Controller('access-events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccessEventsController {
  constructor(private readonly accessEventsService: AccessEventsService) {}

  @Post()
  register(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterEventDto) {
    return this.accessEventsService.register(user.organizationId, user.userId, dto);
  }

  @Get('current')
  current(@CurrentUser() user: AuthenticatedUser) {
    return this.accessEventsService.currentActivity(user.organizationId, user.userId);
  }

  @Get('history')
  history(@CurrentUser() user: AuthenticatedUser, @Query('range') range = 'today') {
    return this.accessEventsService.history(user.organizationId, user.userId, range);
  }

  @Patch('sessions/:id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  correct(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CorrectSessionDto,
  ) {
    return this.accessEventsService.correct(user.organizationId, user.userId, id, dto);
  }
}
