import { SetMetadata } from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@middlewares/roles.guard';

/**
 * Clave para marcar rutas como públicas
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorador para marcar rutas como públicas (sin autenticación)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Clave para metadatos de roles
 */
export const ROLES_KEY = 'roles';

/**
 * Decorador para especificar roles requeridos en una ruta
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorador para obtener el usuario actual de la request
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});

/**
 * Decorador para obtener solo el ID del usuario actual
 */
export const CurrentUserId = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.sub || request.user?.id;
});

/**
 * Decorador para obtener el rol del usuario actual
 */
export const CurrentUserRole = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.role;
});
