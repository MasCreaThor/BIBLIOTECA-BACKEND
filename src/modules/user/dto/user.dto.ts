import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

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

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  active?: boolean;
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
