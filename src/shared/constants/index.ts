/**
 * Constantes para roles de usuario
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  LIBRARIAN: 'librarian',
} as const;

/**
 * Constantes para tipos de usuarios (estudiantes/docentes)
 */
export const PERSON_TYPES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
} as const;

/**
 * Constantes para tipos de recursos
 */
export const RESOURCE_TYPES = {
  BOOK: 'book',
  GAME: 'game',
  MAP: 'map',
  BIBLE: 'bible',
} as const;

/**
 * Constantes para estados de recursos
 */
export const RESOURCE_STATES = {
  GOOD: 'good',
  DETERIORATED: 'deteriorated',
  DAMAGED: 'damaged',
  LOST: 'lost',
} as const;

/**
 * Constantes para estados de préstamos
 */
export const LOAN_STATUSES = {
  ACTIVE: 'active',
  RETURNED: 'returned',
  OVERDUE: 'overdue',
  LOST: 'lost',
} as const;

/**
 * Constantes para estados de solicitudes
 */
export const REQUEST_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  ACQUIRED: 'acquired',
  REJECTED: 'rejected',
} as const;

/**
 * Constantes para prioridades de solicitudes
 */
export const REQUEST_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

/**
 * Constantes para la biblioteca
 */
export const LIBRARY_CONSTANTS = {
  MAX_LOAN_DAYS: 15,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PASSWORD_LENGTH: 8,
  MAX_SEARCH_RESULTS: 50,
} as const;

/**
 * Constantes para validaciones - REGEX CORREGIDO
 */
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  PHONE: /^[+]?[1-9][\d]{0,15}$/,
  ISBN: /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/,
} as const;

/**
 * Constantes para mensajes de error
 */
export const ERROR_MESSAGES = {
  // Generales
  INTERNAL_SERVER_ERROR: 'Error interno del servidor',
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'Acceso denegado',
  NOT_FOUND: 'Recurso no encontrado',
  BAD_REQUEST: 'Solicitud incorrecta',
  VALIDATION_ERROR: 'Error de validación',

  // Autenticación
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  TOKEN_EXPIRED: 'Token expirado',
  TOKEN_INVALID: 'Token inválido',
  SESSION_EXPIRED: 'Sesión expirada',

  // Usuarios
  USER_NOT_FOUND: 'Usuario no encontrado',
  USER_ALREADY_EXISTS: 'El usuario ya existe',
  EMAIL_ALREADY_EXISTS: 'El email ya está registrado',
  INVALID_PASSWORD: 'Contraseña inválida',

  // Recursos
  RESOURCE_NOT_FOUND: 'Recurso no encontrado',
  RESOURCE_NOT_AVAILABLE: 'Recurso no disponible para préstamo',
  RESOURCE_ALREADY_LOANED: 'El recurso ya está prestado',

  // Préstamos
  LOAN_NOT_FOUND: 'Préstamo no encontrado',
  LOAN_ALREADY_RETURNED: 'El préstamo ya fue devuelto',
  MAX_LOANS_EXCEEDED: 'Se ha excedido el límite de préstamos',
  OVERDUE_LOANS_EXIST: 'El usuario tiene préstamos vencidos',

  // Categorías
  CATEGORY_NOT_FOUND: 'Categoría no encontrada',
  CATEGORY_IN_USE: 'La categoría está en uso y no puede eliminarse',

  // Ubicaciones
  LOCATION_NOT_FOUND: 'Ubicación no encontrada',
  LOCATION_IN_USE: 'La ubicación está en uso y no puede eliminarse',
} as const;

/**
 * Constantes para mensajes de éxito
 */
export const SUCCESS_MESSAGES = {
  CREATED: 'Creado exitosamente',
  UPDATED: 'Actualizado exitosamente',
  DELETED: 'Eliminado exitosamente',
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  LOGOUT_SUCCESS: 'Cierre de sesión exitoso',
  LOAN_CREATED: 'Préstamo registrado exitosamente',
  LOAN_RETURNED: 'Devolución registrada exitosamente',
  EMAIL_SENT: 'Email enviado exitosamente',
} as const;

/**
 * Configuración de Google Books API
 */
export const GOOGLE_BOOKS_CONFIG = {
  BASE_URL: 'https://www.googleapis.com/books/v1',
  MAX_RESULTS: 10,
  TIMEOUT: 5000,
  CACHE_TTL: 3600, // 1 hora en segundos
} as const;

/**
 * Configuración de archivos
 */
export const FILE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  UPLOAD_PATH: 'uploads',
} as const;
