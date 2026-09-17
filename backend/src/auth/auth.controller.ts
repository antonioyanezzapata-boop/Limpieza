import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SetOfflineCredentialsDto } from './dto/set-offline-credentials.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip);
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: any) {
    return this.authService.refresh(req.user.sub, dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: AuthenticatedUser, @Body() dto: RefreshDto) {
    return this.authService.logout(user.userId, dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('offline-credentials')
  setOfflineCredentials(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetOfflineCredentialsDto,
  ) {
    return this.authService.setOfflineCredentials(user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify-active')
  verifyActive(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.verifyStillActive(user.userId);
  }
}
