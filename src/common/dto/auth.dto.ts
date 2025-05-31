import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTOs para autenticación
 * Ruta: src/common/dto/auth.dto.ts
 */

export class LoginDto {
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @IsString({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;
}

export class CreateUserDto {
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @IsString({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @IsEnum(['admin', 'librarian'], { message: 'El rol debe ser admin o librarian' })
  role!: 'admin' | 'librarian';
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @IsOptional()
  @IsString({ message: 'La contraseña debe ser un string' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @IsOptional()
  @IsEnum(['admin', 'librarian'], { message: 'El rol debe ser admin o librarian' })
  role?: 'admin' | 'librarian';
}

export class ChangePasswordDto {
  @IsString({ message: 'La contraseña actual es requerida' })
  currentPassword!: string;

  @IsString({ message: 'La nueva contraseña es requerida' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  newPassword!: string;
}

export class LoginResponseDto {
  access_token!: string;
  user!: {
    id: string;
    email: string;
    role: string;
    lastLogin: Date;
  };
}

export class UserResponseDto {
  _id!: string;
  email!: string;
  role!: string;
  active!: boolean;
  lastLogin?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
