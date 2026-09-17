import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Controller('areas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Post()
  @Roles(RoleName.ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAreaDto) {
    return this.areasService.create(user.organizationId, user.userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('floor') floor?: string,
    @Query('zone') zone?: string,
  ) {
    return this.areasService.findAll(user.organizationId, { search, status, floor, zone });
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.areasService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateAreaDto) {
    return this.areasService.update(user.organizationId, user.userId, id, dto);
  }

  @Post(':id/deactivate')
  @Roles(RoleName.ADMIN)
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.areasService.deactivate(user.organizationId, user.userId, id);
  }

  @Post(':id/activate')
  @Roles(RoleName.ADMIN)
  activate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.areasService.activate(user.organizationId, user.userId, id);
  }
}
