import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',

  // Configuración de la base de datos MongoDB
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/biblioteca-escolar',
    options: {
      // Opciones modernas de Mongoose 8.x compatibles
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000, // Tiempo de espera para seleccionar servidor
      socketTimeoutMS: 45000,
      family: 4,
    },
  },

  // Configuración para JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'biblioteca_escolar_super_secret_key_2025',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // Configuración de seguridad
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
  },

  // Opciones de logging
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    directory: process.env.LOG_DIRECTORY || 'logs',
  },

  // Configuración para Google Books API
  googleBooks: {
    apiKey: process.env.GOOGLE_BOOKS_API_KEY || '',
    baseUrl: 'https://www.googleapis.com/books/v1',
    maxResults: parseInt(process.env.GOOGLE_BOOKS_MAX_RESULTS || '10', 10),
  },

  // Configuración de CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  },

  // Configuración de paginación por defecto
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGINATION_LIMIT || '20', 10),
    maxLimit: parseInt(process.env.MAX_PAGINATION_LIMIT || '100', 10),
  },
}));
