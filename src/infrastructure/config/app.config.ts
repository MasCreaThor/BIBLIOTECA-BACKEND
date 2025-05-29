import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api',

  // Configuración de la base de datos (para futuro uso)
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/biblioteca',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },

  // Configuración para JWT (para futuro uso)
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecret_biblioteca_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },

  // Opciones de logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIRECTORY || 'logs',
  },

  // Configuración para Google Books API (para futuro uso)
  googleBooks: {
    apiKey: process.env.GOOGLE_BOOKS_API_KEY || '',
  },
}));
