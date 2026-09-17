import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function contextWithUser(role: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard (permisos por rol)', () => {
  it('permite el acceso cuando el endpoint no declara roles', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWithUser('CLEANING_STAFF'))).toBe(true);
  });

  it('permite el acceso cuando el rol del usuario está autorizado', () => {
    const reflector = { getAllAndOverride: () => [RoleName.ADMIN] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWithUser('ADMIN'))).toBe(true);
  });

  it('rechaza el acceso cuando el rol del usuario no está autorizado', () => {
    const reflector = { getAllAndOverride: () => [RoleName.ADMIN] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contextWithUser('CLEANING_STAFF'))).toThrow(ForbiddenException);
  });
});
