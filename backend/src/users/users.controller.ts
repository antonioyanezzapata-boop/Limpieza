import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(RoleName.ADMIN)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    return this.usersService.create(user.organizationId, user.userId, dto);
  }

  @Get()
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll(user.organizationId, { search, status, role });
  }

  @Get(':id')
  @Roles(RoleName.ADMIN, RoleName.SUPERVISOR)
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN)
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(user.organizationId, user.userId, id, dto);
  }

  @Post(':id/deactivate')
  @Roles(RoleName.ADMIN)
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.deactivate(user.organizationId, user.userId, id);
  }

  @Post(':id/activate')
  @Roles(RoleName.ADMIN)
  activate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.usersService.activate(user.organizationId, user.userId, id);
  }

  @Post(':id/reset-password')
  @Roles(RoleName.ADMIN)
  resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(user.organizationId, user.userId, id, dto.newPassword);
  }
}
