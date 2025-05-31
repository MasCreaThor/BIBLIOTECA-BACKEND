import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { LoggerService } from '@common/services/logger.service';

/**
 * Servicio para manejo de contraseñas
 */

@Injectable()
export class PasswordService {
  private readonly saltRounds: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.saltRounds = this.configService.get<number>('app.security.bcryptSaltRounds', 12);
    this.logger.setContext('PasswordService');
  }

  /**
   * Encriptar una contraseña
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);
      this.logger.debug('Password hashed successfully');
      return hashedPassword;
    } catch (error) {
      this.logger.error('Error hashing password', error);
      throw new Error('Error al encriptar la contraseña');
    }
  }

  /**
   * Verificar una contraseña contra su hash
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hashedPassword);
      this.logger.debug(`Password verification: ${isValid ? 'valid' : 'invalid'}`);
      return isValid;
    } catch (error) {
      this.logger.error('Error verifying password', error);
      return false;
    }
  }

  /**
   * Validar que la contraseña cumple con los requisitos mínimos
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const minLength = this.configService.get<number>('app.security.passwordMinLength', 8);

    if (!password) {
      errors.push('La contraseña es requerida');
      return { isValid: false, errors };
    }

    if (password.length < minLength) {
      errors.push(`La contraseña debe tener al menos ${minLength} caracteres`);
    }

    if (!/[a-z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }

    if (!/\d/.test(password)) {
      errors.push('La contraseña debe contener al menos un número');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('La contraseña debe contener al menos un carácter especial');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generar una contraseña aleatoria segura
   */
  generateRandomPassword(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*(),.?":{}|<>';

    const allCharacters = lowercase + uppercase + numbers + symbols;

    let password = '';

    // Asegurar que al menos haya uno de cada tipo
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Completar el resto de la longitud
    for (let i = 4; i < length; i++) {
      password += allCharacters[Math.floor(Math.random() * allCharacters.length)];
    }

    // Mezclar los caracteres
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Verificar si dos contraseñas coinciden
   */
  arePasswordsEqual(password1: string, password2: string): boolean {
    return password1 === password2;
  }
}
