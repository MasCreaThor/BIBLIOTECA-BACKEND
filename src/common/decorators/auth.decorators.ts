import { SetMetadata } from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@middlewares/roles.guard';

/**
 * Interfaz para el usuario en el JWT payload
 */
export interface JwtUser {
  sub: string;
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Interfaz extendida del Request con usuario tipado
 */
export interface RequestWithUser extends Request {
  user: JwtUser;
}

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
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): JwtUser => {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  return request.user;
});

/**
 * Decorador para obtener solo el ID del usuario actual
 */
export const CurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.sub || request.user?.id;
  },
);

/**
 * Decorador para obtener el rol del usuario actual
 */
export const CurrentUserRole = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserRole => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.role;
  },
);
